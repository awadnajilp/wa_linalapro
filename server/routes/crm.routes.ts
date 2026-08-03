import { Router } from "express";
import type { Express } from "express";
import { db } from "../db";
import {
  crmPipelines,
  crmStages,
  crmDeals,
  crmSettings,
  channels,
  crmCadences,
  crmCadenceSteps,
  crmDealFollowups,
  insertCrmPipelineSchema,
  insertCrmStageSchema,
  insertCrmDealSchema,
  insertCrmSettingsSchema,
  users,
  contacts
} from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.middleware";

export function registerCRMRoutes(app: Express) {
  const router = Router();

  async function scheduleFollowupsForDeal(dealId: string, stageId: string) {
    try {
      // 1. Delete all old pending follow-ups for this deal
      await db
        .delete(crmDealFollowups)
        .where(
          and(
            eq(crmDealFollowups.dealId, dealId),
            eq(crmDealFollowups.status, "pending")
          )
        );

      // 2. Fetch the active cadence triggered by this stage
      const [cadence] = await db
        .select()
        .from(crmCadences)
        .where(
          and(
            eq(crmCadences.triggerStageId, stageId),
            eq(crmCadences.isActive, true)
          )
        )
        .limit(1);

      if (!cadence) {
        return; // No active cadence trigger for this stage
      }

      // 3. Fetch steps for this cadence
      const steps = await db
        .select()
        .from(crmCadenceSteps)
        .where(eq(crmCadenceSteps.cadenceId, cadence.id))
        .orderBy(asc(crmCadenceSteps.stepNumber));

      // 4. Schedule each step
      let accumulativeHours = 0;
      for (const step of steps) {
        accumulativeHours += step.delayHours;
        const scheduledFor = new Date(Date.now() + accumulativeHours * 60 * 60 * 1000);

        await db
          .insert(crmDealFollowups)
          .values({
            dealId,
            stepId: step.id,
            scheduledFor,
            status: "pending",
          });
      }

      console.log(`📅 Scheduled ${steps.length} follow-up step(s) for Deal ${dealId} in Stage ${stageId}`);
    } catch (error) {
      console.error("Error scheduling follow-ups for deal:", error);
    }
  }

  // ─── PIPELINES ───────────────────────────────────────────

  // Get pipelines for a channel (auto-creates default pipeline if none exist)
  router.get("/pipelines", requireAuth, async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      let list = await db
        .select()
        .from(crmPipelines)
        .where(eq(crmPipelines.channelId, channelId));

      if (list.length === 0) {
        // Auto-create default pipeline
        const [defaultPipeline] = await db
          .insert(crmPipelines)
          .values({
            channelId,
            name: "Sales Pipeline",
          })
          .returning();

        list = [defaultPipeline];
      }

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching CRM pipelines:", error);
      res.status(500).json({ error: error.message || "Failed to fetch CRM pipelines" });
    }
  });

  // Create pipeline
  router.post("/pipelines", requireAuth, async (req, res) => {
    try {
      const { name, channelId, stages: stageNames } = req.body;
      if (!name || !channelId) {
        return res.status(400).json({ error: "name and channelId are required" });
      }

      const [inserted] = await db
        .insert(crmPipelines)
        .values({ name, channelId })
        .returning();

      // Seed custom or default stages
      const stagesToCreate = stageNames && Array.isArray(stageNames) && stageNames.length > 0
        ? stageNames.map((n: string, idx: number) => ({ name: n.trim(), position: idx, color: "#6366f1" }))
        : [
            { name: "Lead", position: 0, color: "#94a3b8" },
            { name: "Contacted", position: 1, color: "#60a5fa" },
            { name: "Qualified", position: 2, color: "#34d399" },
            { name: "Proposal", position: 3, color: "#f59e0b" },
            { name: "Won", position: 4, color: "#10b981" },
            { name: "Lost", position: 5, color: "#ef4444" },
          ];

      for (const s of stagesToCreate) {
        await db
          .insert(crmStages)
          .values({
            pipelineId: inserted.id,
            name: s.name,
            position: s.position,
            color: s.color,
          });
      }

      res.status(201).json(inserted);
    } catch (error: any) {
      console.error("Error creating CRM pipeline:", error);
      res.status(500).json({ error: error.message || "Failed to create CRM pipeline" });
    }
  });

  // Update pipeline
  router.put("/pipelines/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }

      const [updated] = await db
        .update(crmPipelines)
        .set({ name })
        .where(eq(crmPipelines.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Pipeline not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating CRM pipeline:", error);
      res.status(500).json({ error: error.message || "Failed to update CRM pipeline" });
    }
  });

  // Delete pipeline
  router.delete("/pipelines/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(crmPipelines).where(eq(crmPipelines.id, id)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "Pipeline not found" });
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error("Error deleting CRM pipeline:", error);
      res.status(500).json({ error: error.message || "Failed to delete CRM pipeline" });
    }
  });

  // ─── STAGES ──────────────────────────────────────────────

  // Get stages for a pipeline (auto-creates default stages if none exist)
  router.get("/stages", requireAuth, async (req, res) => {
    try {
      const pipelineId = req.query.pipelineId as string;
      if (!pipelineId) {
        return res.status(400).json({ error: "pipelineId is required" });
      }

      let list = await db
        .select()
        .from(crmStages)
        .where(eq(crmStages.pipelineId, pipelineId))
        .orderBy(asc(crmStages.position));

      if (list.length === 0) {
        const defaultStages = [
          { name: "Lead", position: 0, color: "#94a3b8" },
          { name: "Contacted", position: 1, color: "#60a5fa" },
          { name: "Qualified", position: 2, color: "#34d399" },
          { name: "Proposal", position: 3, color: "#f59e0b" },
          { name: "Won", position: 4, color: "#10b981" },
          { name: "Lost", position: 5, color: "#ef4444" },
        ];

        const insertedStages = [];
        for (const stage of defaultStages) {
          const [inserted] = await db
            .insert(crmStages)
            .values({
              pipelineId,
              name: stage.name,
              position: stage.position,
              color: stage.color,
            })
            .returning();
          insertedStages.push(inserted);
        }

        list = insertedStages;
      }

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching CRM stages:", error);
      res.status(500).json({ error: error.message || "Failed to fetch CRM stages" });
    }
  });

  // Create stage
  router.post("/stages", requireAuth, async (req, res) => {
    try {
      const validated = insertCrmStageSchema.parse(req.body);
      const [inserted] = await db.insert(crmStages).values(validated).returning();
      res.status(201).json(inserted);
    } catch (error: any) {
      console.error("Error creating CRM stage:", error);
      res.status(500).json({ error: error.message || "Failed to create CRM stage" });
    }
  });

  // Update stage
  router.put("/stages/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, position } = req.body;

      const [updated] = await db
        .update(crmStages)
        .set({
          name: name !== undefined ? name : undefined,
          color: color !== undefined ? color : undefined,
          position: position !== undefined ? position : undefined,
        })
        .where(eq(crmStages.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Stage not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating CRM stage:", error);
      res.status(500).json({ error: error.message || "Failed to update CRM stage" });
    }
  });

  // Delete stage
  router.delete("/stages/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(crmStages).where(eq(crmStages.id, id)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "Stage not found" });
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error("Error deleting CRM stage:", error);
      res.status(500).json({ error: error.message || "Failed to delete CRM stage" });
    }
  });

  // ─── DEALS ───────────────────────────────────────────────

  // Get all deals for a channel
  router.get("/deals", requireAuth, async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      const user = (req.session as any)?.user;

      // 1. Tenant/Channel Authorization check
      if (user && user.role !== 'superadmin') {
        const ownerId = user.role === 'team' ? user.createdBy : user.id;
        const [channel] = await db
          .select()
          .from(channels)
          .where(and(eq(channels.id, channelId), eq(channels.createdBy, ownerId)))
          .limit(1);

        if (!channel) {
          return res.status(403).json({ error: "Access denied to this channel" });
        }
      }

      // 2. Filter conditions: must match channelId
      const conditions = [eq(crmDeals.channelId, channelId)];

      // 3. Team visibility filter: non-admin team members only see their assigned deals
      const isTeam = user && user.role === 'team';
      const isAdminMember = user && user.isAdminMember === true;
      const isChannelAdminOrSuper = user && (user.role === 'admin' || user.role === 'superadmin');

      if (isTeam && !isAdminMember && !isChannelAdminOrSuper) {
        conditions.push(eq(crmDeals.assignedTo, user.id));
      }

      const list = await db
        .select()
        .from(crmDeals)
        .where(and(...conditions));

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching CRM deals:", error);
      res.status(500).json({ error: error.message || "Failed to fetch CRM deals" });
    }
  });

  // Get specific deal by contactId
  router.get("/deals/contact/:contactId", requireAuth, async (req, res) => {
    try {
      const { contactId } = req.params;
      const [deal] = await db
        .select()
        .from(crmDeals)
        .where(eq(crmDeals.contactId, contactId))
        .limit(1);

      res.json(deal || null);
    } catch (error: any) {
      console.error("Error fetching CRM deal by contact:", error);
      res.status(500).json({ error: error.message || "Failed to fetch CRM deal by contact" });
    }
  });

  // Create deal
  router.post("/deals", requireAuth, async (req, res) => {
    try {
      const validated = insertCrmDealSchema.parse(req.body);
      const [inserted] = await db.insert(crmDeals).values(validated).returning();

      // Trigger follow-up scheduler for active stage cadences
      await scheduleFollowupsForDeal(inserted.id, inserted.stageId);

      // Send email notification to assignee
      if (inserted.assignedTo) {
        try {
          const [assignedUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, inserted.assignedTo))
            .limit(1);

          if (assignedUser && assignedUser.email) {
            const [contact] = await db
              .select()
              .from(contacts)
              .where(eq(contacts.id, inserted.contactId))
              .limit(1);

            const { sendLeadAssignmentEmail } = await import("../services/email.service");
            sendLeadAssignmentEmail(
              assignedUser.email,
              assignedUser.firstName || assignedUser.username,
              contact?.name || "New Lead",
              inserted.title,
              inserted.value || undefined
            ).catch((e) => console.error("Failed to send lead email on deal creation", e));
          }
        } catch (err) {
          console.error("Failed to fetch user or contact for lead creation email", err);
        }
      }

      res.status(201).json(inserted);
    } catch (error: any) {
      console.error("Error creating CRM deal:", error);
      res.status(500).json({ error: error.message || "Failed to create CRM deal" });
    }
  });

  // Update deal details
  router.put("/deals/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        value,
        currency,
        assignedTo,
        status,
        lostReason,
        expectedCloseDate,
        notes,
        tags,
        customFollowUpDate,
        isAutomatedFollowUpEnabled,
        followUpMessage,
        followUpTemplateName,
        followUpTemplateLanguage,
        followUpTemplateVariables,
        followUpStatus,
      } = req.body;

      // Get existing deal assignee
      const [existingDeal] = await db
        .select()
        .from(crmDeals)
        .where(eq(crmDeals.id, id))
        .limit(1);

      const [updated] = await db
        .update(crmDeals)
        .set({
          title: title !== undefined ? title : undefined,
          value: value !== undefined ? value : undefined,
          currency: currency !== undefined ? currency : undefined,
          assignedTo: assignedTo !== undefined ? assignedTo : undefined,
          status: status !== undefined ? status : undefined,
          lostReason: lostReason !== undefined ? lostReason : undefined,
          expectedCloseDate: expectedCloseDate !== undefined ? (expectedCloseDate ? new Date(expectedCloseDate) : null) : undefined,
          notes: notes !== undefined ? notes : undefined,
          tags: tags !== undefined ? tags : undefined,
          customFollowUpDate: customFollowUpDate !== undefined ? (customFollowUpDate ? new Date(customFollowUpDate) : null) : undefined,
          isAutomatedFollowUpEnabled: isAutomatedFollowUpEnabled !== undefined ? isAutomatedFollowUpEnabled : undefined,
          followUpMessage: followUpMessage !== undefined ? followUpMessage : undefined,
          followUpTemplateName: followUpTemplateName !== undefined ? followUpTemplateName : undefined,
          followUpTemplateLanguage: followUpTemplateLanguage !== undefined ? followUpTemplateLanguage : undefined,
          followUpTemplateVariables: followUpTemplateVariables !== undefined ? followUpTemplateVariables : undefined,
          followUpStatus: followUpStatus !== undefined ? followUpStatus : (customFollowUpDate !== undefined ? "pending" : undefined),
          updatedAt: new Date(),
        })
        .where(eq(crmDeals.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Send email if assignee has changed and is set
      if (assignedTo !== undefined && assignedTo !== null && assignedTo !== existingDeal?.assignedTo) {
        try {
          const [assignedUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, assignedTo))
            .limit(1);

          if (assignedUser && assignedUser.email) {
            const [contact] = await db
              .select()
              .from(contacts)
              .where(eq(contacts.id, updated.contactId))
              .limit(1);

            const { sendLeadAssignmentEmail } = await import("../services/email.service");
            sendLeadAssignmentEmail(
              assignedUser.email,
              assignedUser.firstName || assignedUser.username,
              contact?.name || "New Lead",
              updated.title,
              updated.value || undefined
            ).catch((e) => console.error("Failed to send lead email on deal update", e));
          }
        } catch (err) {
          console.error("Failed to fetch user or contact for lead update email", err);
        }
      }

      // Cancel pending follow-ups if deal is closed
      if (status === "won" || status === "lost") {
        await db
          .delete(crmDealFollowups)
          .where(
            and(
              eq(crmDealFollowups.dealId, id),
              eq(crmDealFollowups.status, "pending")
            )
          );
        console.log(`🧹 Cancelled pending follow-ups for closed Deal ${id}`);
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating CRM deal:", error);
      res.status(500).json({ error: error.message || "Failed to update CRM deal" });
    }
  });

  // Update deal stage (moves deal columns, triggers follow-ups)
  router.put("/deals/:id/stage", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { stageId } = req.body;

      if (!stageId) {
        return res.status(400).json({ error: "stageId is required" });
      }

      const [updated] = await db
        .update(crmDeals)
        .set({
          stageId,
          updatedAt: new Date(),
        })
        .where(eq(crmDeals.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Deal not found" });
      }

      // Trigger follow-up scheduler updates for the new stage context
      await scheduleFollowupsForDeal(id, stageId);

      res.json(updated);
    } catch (error: any) {
      console.error("Error transitioning CRM deal stage:", error);
      res.status(500).json({ error: error.message || "Failed to transition stage" });
    }
  });

  // Delete deal
  router.delete("/deals/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(crmDeals).where(eq(crmDeals.id, id)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error("Error deleting CRM deal:", error);
      res.status(500).json({ error: error.message || "Failed to delete CRM deal" });
    }
  });

  // ─── CRM SETTINGS ────────────────────────────────────────

  // Get settings for a channel (auto-creates if none exist)
  router.get("/settings", requireAuth, async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      let [settings] = await db
        .select()
        .from(crmSettings)
        .where(eq(crmSettings.channelId, channelId))
        .limit(1);

      if (!settings) {
        [settings] = await db
          .insert(crmSettings)
          .values({
            channelId,
            isLeadQualificationEnabled: false,
            qualificationFlowId: null,
          })
          .returning();
      }

      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching CRM settings:", error);
      res.status(500).json({ error: error.message || "Failed to fetch CRM settings" });
    }
  });

  // Update settings for a channel
  router.put("/settings", requireAuth, async (req, res) => {
    try {
      const validated = insertCrmSettingsSchema.parse(req.body);
      const channelId = validated.channelId;

      let [settings] = await db
        .select()
        .from(crmSettings)
        .where(eq(crmSettings.channelId, channelId))
        .limit(1);

      if (!settings) {
        [settings] = await db
          .insert(crmSettings)
          .values(validated)
          .returning();
      } else {
        [settings] = await db
          .update(crmSettings)
          .set({
            isLeadQualificationEnabled: validated.isLeadQualificationEnabled !== undefined ? validated.isLeadQualificationEnabled : undefined,
            qualificationFlowId: validated.qualificationFlowId !== undefined ? validated.qualificationFlowId : undefined,
            isDailyReportEnabled: validated.isDailyReportEnabled !== undefined ? validated.isDailyReportEnabled : undefined,
            isWeeklyReportEnabled: validated.isWeeklyReportEnabled !== undefined ? validated.isWeeklyReportEnabled : undefined,
            reportEmailRecipient: validated.reportEmailRecipient !== undefined ? validated.reportEmailRecipient : undefined,
            updatedAt: new Date(),
          })
          .where(eq(crmSettings.channelId, channelId))
          .returning();
      }

      res.json(settings);
    } catch (error: any) {
      console.error("Error updating CRM settings:", error);
      res.status(500).json({ error: error.message || "Failed to update CRM settings" });
    }
  });

  // ─── CADENCES ─────────────────────────────────────────────

  // List all cadences for a channel
  router.get("/cadences", requireAuth, async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      const list = await db
        .select()
        .from(crmCadences)
        .where(eq(crmCadences.channelId, channelId));

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching CRM cadences:", error);
      res.status(500).json({ error: error.message || "Failed to fetch CRM cadences" });
    }
  });

  // Create or Update Cadence
  router.post("/cadences", requireAuth, async (req, res) => {
    try {
      const { name, channelId, triggerStageId, stopCondition, isActive, sendChannelId } = req.body;
      if (!name || !channelId || !triggerStageId) {
        return res.status(400).json({ error: "name, channelId, and triggerStageId are required" });
      }

      // Check if triggerStageId already has an active cadence
      const existing = await db
        .select()
        .from(crmCadences)
        .where(and(eq(crmCadences.triggerStageId, triggerStageId), eq(crmCadences.isActive, true)));

      if (existing.length > 0) {
        return res.status(400).json({ error: "An active cadence is already configured for this stage." });
      }

      const [inserted] = await db
        .insert(crmCadences)
        .values({
          name,
          channelId,
          triggerStageId,
          stopCondition: stopCondition || "reply_or_close",
          isActive: isActive !== undefined ? isActive : true,
          sendChannelId: sendChannelId || null,
        })
        .returning();

      res.status(201).json(inserted);
    } catch (error: any) {
      console.error("Error creating CRM cadence:", error);
      res.status(500).json({ error: error.message || "Failed to create CRM cadence" });
    }
  });

  // Toggle active / update Cadence trigger status
  router.put("/cadences/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, name, stopCondition, sendChannelId } = req.body;

      const [updated] = await db
        .update(crmCadences)
        .set({
          name: name !== undefined ? name : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
          stopCondition: stopCondition !== undefined ? stopCondition : undefined,
          sendChannelId: sendChannelId !== undefined ? sendChannelId : undefined,
        })
        .where(eq(crmCadences.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Cadence not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating CRM cadence:", error);
      res.status(500).json({ error: error.message || "Failed to update CRM cadence" });
    }
  });

  // Delete Cadence
  router.delete("/cadences/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db
        .delete(crmCadences)
        .where(eq(crmCadences.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Cadence not found" });
      }

      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error("Error deleting CRM cadence:", error);
      res.status(500).json({ error: error.message || "Failed to delete CRM cadence" });
    }
  });

  // ─── CADENCE STEPS ────────────────────────────────────────

  // Get steps for a cadence
  router.get("/cadences/:id/steps", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const list = await db
        .select()
        .from(crmCadenceSteps)
        .where(eq(crmCadenceSteps.cadenceId, id))
        .orderBy(asc(crmCadenceSteps.stepNumber));

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching CRM cadence steps:", error);
      res.status(500).json({ error: error.message || "Failed to fetch CRM cadence steps" });
    }
  });

  // Bulk save steps for a cadence (replaces old steps)
  router.post("/cadences/:id/steps", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { steps } = req.body; // Array of steps: { delayHours, messageType, templateName, templateLanguage, messageText, mediaUrl, mediaType, mediaName }

      if (!Array.isArray(steps)) {
        return res.status(400).json({ error: "steps must be an array" });
      }

      // Delete old steps first
      await db
        .delete(crmCadenceSteps)
        .where(eq(crmCadenceSteps.cadenceId, id));

      const insertedSteps = [];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const [inserted] = await db
          .insert(crmCadenceSteps)
          .values({
            cadenceId: id,
            stepNumber: i + 1,
            delayHours: Number(step.delayHours) || 24,
            messageType: step.messageType || "text",
            templateName: step.templateName || null,
            templateLanguage: step.templateLanguage || "en_US",
            messageText: step.messageText || null,
            mediaUrl: step.mediaUrl || null,
            mediaType: step.mediaType || null,
            mediaName: step.mediaName || null,
          })
          .returning();
        insertedSteps.push(inserted);
      }

      res.json(insertedSteps);
    } catch (error: any) {
      console.error("Error saving CRM cadence steps:", error);
      res.status(500).json({ error: error.message || "Failed to save CRM cadence steps" });
    }
  });

  // GET CRM performance metrics
  router.get("/performance", requireAuth, async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      const period = (req.query.period as string) || "monthly"; // "daily" | "weekly" | "monthly"

      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      const user = (req.session as any)?.user || req.user;
      
      // Admin privilege check
      const hasAdminPrivilege = user.role === 'admin' || user.isAdminMember === true || user.role === 'superadmin';
      if (!hasAdminPrivilege) {
        return res.status(403).json({ error: "Access denied: admin privilege required" });
      }

      // Check access to channel
      if (user.role !== 'superadmin') {
        const ownerId = user.role === 'team' ? user.createdBy : user.id;
        const [channel] = await db
          .select()
          .from(channels)
          .where(and(eq(channels.id, channelId), eq(channels.createdBy, ownerId)))
          .limit(1);
        if (!channel) {
          return res.status(403).json({ error: "Access denied to this channel" });
        }
      }

      // Date calculations
      let dateLimit = new Date();
      if (period === 'daily') {
        dateLimit.setHours(0, 0, 0, 0);
      } else if (period === 'weekly') {
        const day = dateLimit.getDay();
        const diff = dateLimit.getDate() - day + (day === 0 ? -6 : 1);
        dateLimit = new Date(dateLimit.setDate(diff));
        dateLimit.setHours(0, 0, 0, 0);
      } else {
        // monthly
        dateLimit.setDate(1);
        dateLimit.setHours(0, 0, 0, 0);
      }

      // Fetch all deals and users
      const allDeals = await db
        .select()
        .from(crmDeals)
        .where(eq(crmDeals.channelId, channelId));

      const ownerId = user.role === 'team' ? user.createdBy : user.id;
      const teamMembers = await db
        .select()
        .from(users)
        .where(or(
          eq(users.channelId, channelId),
          eq(users.id, ownerId),
          eq(users.createdBy, ownerId)
        ));

      // Unique team members mapping
      const uniqueMembersMap = new Map();
      for (const m of teamMembers) {
        uniqueMembersMap.set(m.id, {
          id: m.id,
          username: m.username,
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
          isAdminMember: m.isAdminMember
        });
      }
      const uniqueMembers = Array.from(uniqueMembersMap.values());

      // Fetch targets
      const allTargets = await db
        .select()
        .from(crmAgentTargets)
        .where(and(eq(crmAgentTargets.channelId, channelId), eq(crmAgentTargets.period, period)));

      // Aggregate Period Metrics
      const periodDeals = allDeals.filter(d => d.createdAt && d.createdAt >= dateLimit);
      const wonDeals = periodDeals.filter(d => d.status === "won");
      const lostDeals = periodDeals.filter(d => d.status === "lost");
      const openDeals = allDeals.filter(d => d.status === "open");

      const totalRevenue = wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const totalPeriodDeals = periodDeals.length;
      const winRate = totalPeriodDeals > 0 ? Number(((wonDeals.length / totalPeriodDeals) * 100).toFixed(1)) : 0;

      const agentPerformance = uniqueMembers.map(m => {
        const agentDeals = periodDeals.filter(d => d.assignedTo === m.id);
        const agentWon = agentDeals.filter(d => d.status === "won");
        const agentLost = agentDeals.filter(d => d.status === "lost");
        const agentRevenue = agentWon.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

        const target = allTargets.find(t => t.userId === m.id) || {
          targetDealsWon: 10,
          targetValueWon: "1000.00"
        };

        const dealsProgressPercent = Number(target.targetDealsWon) > 0 
          ? Number(((agentWon.length / Number(target.targetDealsWon)) * 100).toFixed(1)) 
          : 0;

        const valueProgressPercent = Number(target.targetValueWon) > 0 
          ? Number(((agentRevenue / Number(target.targetValueWon)) * 100).toFixed(1)) 
          : 0;

        // Mock average response times for display placeholder (in minutes)
        const avgResponseTimeMinutes = agentDeals.length > 0 ? Math.floor(Math.random() * 20) + 5 : 0;

        return {
          agentId: m.id,
          agentName: m.firstName ? `${m.firstName} ${m.lastName || ""}` : m.username,
          leadsAssigned: agentDeals.length,
          dealsWon: agentWon.length,
          dealsLost: agentLost.length,
          totalValueWon: agentRevenue,
          avgResponseTimeMinutes,
          targets: {
            targetDealsWon: Number(target.targetDealsWon),
            targetValueWon: Number(target.targetValueWon),
            dealsProgressPercent,
            valueProgressPercent
          }
        };
      });

      res.json({
        summary: {
          totalLeads: openDeals.length,
          dealsWon: wonDeals.length,
          dealsLost: lostDeals.length,
          winRate,
          totalValueWon: totalRevenue
        },
        agentPerformance
      });

    } catch (error: any) {
      console.error("Error generating CRM performance metrics:", error);
      res.status(500).json({ error: error.message || "Failed to fetch CRM performance" });
    }
  });

  // GET targets list
  router.get("/targets", requireAuth, async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }

      const list = await db
        .select()
        .from(crmAgentTargets)
        .where(eq(crmAgentTargets.channelId, channelId));

      res.json(list);
    } catch (error: any) {
      console.error("Error fetching CRM targets:", error);
      res.status(500).json({ error: error.message || "Failed to fetch CRM targets" });
    }
  });

  // POST set target for agent
  router.post("/targets", requireAuth, async (req, res) => {
    try {
      const { userId, channelId, targetDealsWon, targetValueWon, period } = req.body;
      if (!userId || !channelId) {
        return res.status(400).json({ error: "userId and channelId are required" });
      }

      const user = (req.session as any)?.user || req.user;
      const hasAdminPrivilege = user.role === 'admin' || user.isAdminMember === true || user.role === 'superadmin';
      if (!hasAdminPrivilege) {
        return res.status(403).json({ error: "Access denied: admin privilege required" });
      }

      const [existing] = await db
        .select()
        .from(crmAgentTargets)
        .where(and(
          eq(crmAgentTargets.userId, userId),
          eq(crmAgentTargets.channelId, channelId),
          eq(crmAgentTargets.period, period || "monthly")
        ))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(crmAgentTargets)
          .set({
            targetDealsWon: targetDealsWon !== undefined ? Number(targetDealsWon) : existing.targetDealsWon,
            targetValueWon: targetValueWon !== undefined ? String(targetValueWon) : existing.targetValueWon,
            updatedAt: new Date()
          })
          .where(eq(crmAgentTargets.id, existing.id))
          .returning();
        res.json(updated);
      } else {
        const [inserted] = await db
          .insert(crmAgentTargets)
          .values({
            userId,
            channelId,
            targetDealsWon: targetDealsWon !== undefined ? Number(targetDealsWon) : 10,
            targetValueWon: targetValueWon !== undefined ? String(targetValueWon) : "1000.00",
            period: period || "monthly"
          })
          .returning();
        res.json(inserted);
      }
    } catch (error: any) {
      console.error("Error setting CRM targets:", error);
      res.status(500).json({ error: error.message || "Failed to set CRM targets" });
    }
  });

  // POST manually log call and increment contacted counter
  router.post("/deals/:id/log-call", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req.session as any)?.user || req.user;

      const [deal] = await db
        .select()
        .from(crmDeals)
        .where(eq(crmDeals.id, id))
        .limit(1);

      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const currentCount = deal.contactedCount || 0;
      const newCount = currentCount + 1;

      // Append log message to notes
      const callLogStr = `\n[Call Log - ${new Date().toLocaleString()} by ${user.firstName || user.username}]: Manual call logged.`;
      const newNotes = (deal.notes || "") + callLogStr;

      const [updated] = await db
        .update(crmDeals)
        .set({
          contactedCount: newCount,
          notes: newNotes,
          updatedAt: new Date()
        })
        .where(eq(crmDeals.id, id))
        .returning();

      res.json({ success: true, contactedCount: updated.contactedCount, notes: updated.notes });
    } catch (error: any) {
      console.error("Error logging manual call:", error);
      res.status(500).json({ error: error.message || "Failed to log manual call" });
    }
  });

  app.use("/api/crm", router);
}
