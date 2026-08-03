/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import cron from "node-cron";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { storage } from "../storage";
import { startCampaignExecution } from "../controllers/campaigns.controller";
import { db } from "../db";
import { campaigns as campaignsTable, messageQueue, contactCampaigns, contacts } from "@shared/schema";
import { sql, eq, and, lte } from "drizzle-orm";
import { MessageQueueService } from "../services/message-queue";
import { calculateNextSendAt } from "../controllers/contact-campaigns.controller";
import { buildContactComponents } from "../controllers/campaigns.controller";

// ⏰ Runs every minute
export function startScheduledCampaignCron() {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Find campaigns whose scheduled time has arrived and are still in "scheduled" state
      const campaigns = await storage.getScheduledCampaigns(now);

      if (campaigns.length > 0) {
        console.log(`[ScheduledCron] Found ${campaigns.length} campaign(s) to start`);
      }

      for (const campaign of campaigns) {
        try {
          console.log(`[ScheduledCron] Starting campaign ${campaign.id} ("${campaign.name}") scheduled for ${campaign.scheduledAt?.toISOString()}`);

          await storage.updateCampaign(campaign.id, { status: "active" });

          const updated = await storage.getCampaign(campaign.id);
          if (!updated || updated.status !== "active") {
            console.error(`[ScheduledCron] Campaign ${campaign.id} failed to transition to active (current status: ${updated?.status ?? "not found"})`);
            continue;
          }

          void startCampaignExecution(campaign.id).catch((err) => {
            console.error(`[ScheduledCron] Error starting campaign ${campaign.id}:`, err);
            storage.updateCampaign(campaign.id, { status: "failed" }).catch(() => {});
          });

          console.log(`[ScheduledCron] Campaign ${campaign.id} started OK`);
        } catch (campaignError) {
          console.error(`[ScheduledCron] Error starting campaign ${campaign.id}:`, campaignError);
        }
      }

      try {
        const orphanedQueued = await db
          .select()
          .from(campaignsTable)
          .where(
            sql`
              ${campaignsTable.status} = 'queued'
              AND ${campaignsTable.updatedAt} < NOW() - INTERVAL '3 minutes'
              AND (
                ${campaignsTable.populationStartedAt} IS NULL
                OR ${campaignsTable.populationStartedAt} < NOW() - INTERVAL '15 minutes'
              )
              AND NOT EXISTS (
                SELECT 1 FROM ${messageQueue}
                WHERE ${messageQueue.campaignId} = ${campaignsTable.id}
              )
            `
          );

        for (const campaign of orphanedQueued) {
          try {
            console.log(`[ScheduledCron] Recovering orphaned-queued campaign: ${campaign.id} ("${campaign.name}")`);
            await storage.updateCampaign(campaign.id, { status: "active" });
            void startCampaignExecution(campaign.id).catch((err) => {
              console.error(`[ScheduledCron] Error recovering orphaned campaign ${campaign.id}:`, err);
              storage.updateCampaign(campaign.id, { status: "failed" }).catch(() => {});
            });
          } catch (err) {
            console.error(`[ScheduledCron] Error during orphan-queued recovery for campaign ${campaign.id}:`, err);
          }
        }
      } catch (err) {
        console.error("[ScheduledCron] Error during orphan-queued safety net:", err);
      }

      // ─── Safety net 2: recover campaigns stuck in "sending" with all messages done ───
      // Handles cases where checkCampaignCompletions was skipped (e.g. server restart
      // mid-batch) leaving the campaign in "sending" forever even though every queued
      // message is already in a terminal state (sent / failed).
      try {
        const orphanedSending = await db
          .select()
          .from(campaignsTable)
          .where(
            sql`
              ${campaignsTable.status} = 'sending'
              AND ${campaignsTable.updatedAt} < NOW() - INTERVAL '10 minutes'
              AND NOT EXISTS (
                SELECT 1 FROM ${messageQueue}
                WHERE ${messageQueue.campaignId} = ${campaignsTable.id}
                  AND ${messageQueue.status} NOT IN ('sent', 'failed')
              )
              AND EXISTS (
                SELECT 1 FROM ${messageQueue}
                WHERE ${messageQueue.campaignId} = ${campaignsTable.id}
              )
            `
          );

        for (const campaign of orphanedSending) {
          try {
            // Query fresh terminal-message counts from message_queue to determine outcome
            const [counts] = await db
              .select({
                sentCount:   sql<number>`COUNT(*) FILTER (WHERE ${messageQueue.status} = 'sent')`,
                failedCount: sql<number>`COUNT(*) FILTER (WHERE ${messageQueue.status} = 'failed')`,
              })
              .from(messageQueue)
              .where(eq(messageQueue.campaignId, campaign.id));

            const sentCount   = Number(counts?.sentCount   ?? 0);
            const failedCount = Number(counts?.failedCount ?? 0);

            // Mark "failed" only if nothing was sent at all; otherwise "completed"
            const finalStatus = sentCount === 0 && failedCount > 0 ? "failed" : "completed";

            console.log(`[ScheduledCron] Recovering orphaned-sending campaign ${campaign.id} ("${campaign.name}") — sent: ${sentCount}, failed: ${failedCount} → marking ${finalStatus}`);
            await storage.updateCampaign(campaign.id, {
              status: finalStatus,
              completedAt: new Date(),
              ...(sentCount > 0   ? { sentCount }   : {}),
              ...(failedCount > 0 ? { failedCount } : {}),
            });
          } catch (err) {
            console.error(`[ScheduledCron] Error during orphan-sending recovery for campaign ${campaign.id}:`, err);
          }
        }
      } catch (err) {
        console.error("[ScheduledCron] Error during orphan-sending safety net:", err);
      }

      // ─── Contact campaigns processor ───
      try {
        await processDueContactCampaigns();
      } catch (ccErr) {
        console.error("[ScheduledCron] Error processing contact campaigns:", ccErr);
      }
    } catch (error) {
      console.error("[ScheduledCron] Unhandled error in scheduled campaigns cron:", error);
    }
  });
}

async function processDueContactCampaigns() {
  const now = new Date();
  const dueCampaigns = await db
    .select({
      campaign: contactCampaigns,
      contact: contacts,
    })
    .from(contactCampaigns)
    .innerJoin(contacts, eq(contacts.id, contactCampaigns.contactId))
    .where(
      and(
        eq(contactCampaigns.status, "active"),
        lte(contactCampaigns.nextSendAt, now),
        eq(contacts.status, "active")
      )
    );

  if (dueCampaigns.length > 0) {
    console.log(`[ContactCampaigns] Found ${dueCampaigns.length} contact campaign(s) to process`);
  }

  for (const { campaign, contact } of dueCampaigns) {
    try {
      console.log(`[ContactCampaigns] Processing campaign ${campaign.id} ("${campaign.name}") for contact ${contact.phone}`);

      let template = null;
      if (campaign.templateId) {
        template = await storage.getTemplate(campaign.templateId);
      }

      const templateParams = template
        ? buildContactComponents(contact, campaign, template, false)
        : {
            customMessage: campaign.customMessage,
            mediaUrl: campaign.mediaUrl,
            mediaType: campaign.mediaMimeType
              ? campaign.mediaMimeType.includes("image")
                ? "image"
                : campaign.mediaMimeType.includes("video")
                ? "video"
                : campaign.mediaMimeType.includes("audio")
                ? "audio"
                : "document"
              : undefined,
            mediaName: campaign.mediaName,
          };

      // Queue the message using MessageQueueService
      await MessageQueueService.queueSingleMessage(
        campaign.channelId,
        contact.phone,
        {
          templateName: campaign.templateName,
          templateLanguage: campaign.templateLanguage,
          templateParams,
          customMessage: campaign.customMessage,
          messageType: "utility",
        }
      );

      // Calculate next send date
      const nextSendAt = calculateNextSendAt(campaign.nextSendAt, campaign.frequency);

      // Update the campaign record
      await db
        .update(contactCampaigns)
        .set({
          lastSentAt: now,
          nextSendAt,
          updatedAt: now,
        })
        .where(eq(contactCampaigns.id, campaign.id));

      console.log(`[ContactCampaigns] Queued message and scheduled next send for ${nextSendAt.toISOString()}`);
    } catch (err) {
      console.error(`[ContactCampaigns] Error processing campaign ${campaign.id}:`, err);
    }
  }
}
