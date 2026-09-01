/**
 * ============================================================
 * © 2026 LINALA — WhatsApp CRM & Marketing Platform
 * ============================================================
 */

import type { Request, Response } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { storage } from "../storage";
import { db } from "../db";
import { contactCampaigns, insertContactCampaignSchema, contacts, contactCampaignTemplates, insertContactCampaignTemplateSchema, messageQueue } from "@shared/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { buildContactComponents } from "./campaigns.controller";
import { MessageQueueService } from "../services/message-queue";

export function calculateNextSendAt(currentNextSendAt: Date, frequency: string): Date {
  const next = new Date(currentNextSendAt);
  if (frequency === "everyday") {
    next.setDate(next.getDate() + 1);
  } else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (frequency === "6months") {
    next.setMonth(next.getMonth() + 6);
  } else if (frequency === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export const getContactCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { contactId } = req.params;
  if (!contactId) {
    return res.status(400).json({ error: "Contact ID is required" });
  }

  const campaigns = await storage.getContactCampaignsByContact(contactId);
  res.json(campaigns);
});

export const createContactCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { contactId } = req.params;
  if (!contactId) {
    return res.status(400).json({ error: "Contact ID is required" });
  }

  const contact = await storage.getContact(contactId);
  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  // Enforce channelId matches contact channel
  const data = {
    ...req.body,
    contactId,
    channelId: contact.channelId,
  };

  const parsed = insertContactCampaignSchema.safeParse(data);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  // Calculate nextSendAt based on scheduledDate
  const scheduledDate = new Date((parsed.data as any).scheduledDate);
  const nextSendAt = new Date(scheduledDate);

  const campaign = await storage.createContactCampaign({
    ...(parsed.data as any),
    scheduledDate,
    nextSendAt,
  });

  // Save as custom template if requested
  if (req.body.saveAsTemplate) {
    const templateName = req.body.templateName || parsed.data.name;
    await storage.createContactCampaignTemplate({
      channelId: contact.channelId,
      name: templateName,
      customMessage: parsed.data.customMessage || null,
      mediaUrl: parsed.data.mediaUrl || null,
      mediaMimeType: parsed.data.mediaMimeType || null,
      mediaName: parsed.data.mediaName || null,
    });
  }

  // Save contact variables if provided
  if (req.body.contactVariables) {
    const updatedVariables = {
      ...(contact.variables || {}),
      ...req.body.contactVariables,
    };
    await storage.updateContact(contact.id, { variables: updatedVariables });
  }

  res.status(201).json(campaign);
});

export const updateContactCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Campaign ID is required" });
  }

  const existing = await storage.getContactCampaign(id);
  if (!existing) {
    return res.status(404).json({ error: "Contact campaign not found" });
  }

  const updates = { ...req.body };

  // If scheduledDate or frequency is updated, recalculate nextSendAt
  if (updates.scheduledDate || updates.frequency) {
    const freq = updates.frequency || existing.frequency;
    const sched = updates.scheduledDate ? new Date(updates.scheduledDate) : new Date(existing.scheduledDate);
    updates.scheduledDate = sched;
    updates.nextSendAt = new Date(sched);
  }

  const updated = await storage.updateContactCampaign(id, updates);
  res.json(updated);
});

export const deleteContactCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Campaign ID is required" });
  }

  const success = await storage.deleteContactCampaign(id);
  if (!success) {
    return res.status(404).json({ error: "Contact campaign not found" });
  }

  res.json({ success: true, message: "Contact campaign deleted successfully" });
});

export const sendContactCampaignNow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Campaign ID is required" });
  }

  const campaign = await storage.getContactCampaign(id);
  if (!campaign) {
    return res.status(404).json({ error: "Contact campaign not found" });
  }

  const contact = await storage.getContact(campaign.contactId);
  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const channel = await storage.getChannel(campaign.channelId);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found" });
  }

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
        mediaMimeType: campaign.mediaMimeType,
      };

  // Queue the message immediately
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

  const now = new Date();
  await db
    .update(contactCampaigns)
    .set({
      lastSentAt: now,
      updatedAt: now,
    })
    .where(eq(contactCampaigns.id, campaign.id));

  res.json({
    success: true,
    message: `Campaign message queued successfully for ${contact.name || contact.phone}`,
  });
});

export const retryFailedContactCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { channelId } = req.params;
  if (!channelId) {
    return res.status(400).json({ error: "Channel ID is required" });
  }

  const channel = await storage.getChannel(channelId);
  if (!channel) {
    return res.status(404).json({ error: "Channel not found" });
  }

  const now = new Date();

  // 1. Reset all failed messages in messageQueue for this channel back to "queued" with 0 attempts
  const failedQueueItems = await db
    .select()
    .from(messageQueue)
    .where(
      and(
        eq(messageQueue.channelId, channelId),
        eq(messageQueue.status, "failed")
      )
    );

  let resetQueueCount = 0;
  if (failedQueueItems.length > 0) {
    await db
      .update(messageQueue)
      .set({
        status: "queued",
        attempts: 0,
        errorMessage: null,
        scheduledFor: now,
      })
      .where(
        and(
          eq(messageQueue.channelId, channelId),
          eq(messageQueue.status, "failed")
        )
      );
    resetQueueCount = failedQueueItems.length;
  }

  // 2. Also find any active contact campaigns for this channel
  const activeCampaigns = await db
    .select({
      campaign: contactCampaigns,
      contact: contacts,
    })
    .from(contactCampaigns)
    .innerJoin(contacts, eq(contacts.id, contactCampaigns.contactId))
    .where(
      and(
        eq(contactCampaigns.channelId, channelId),
        eq(contactCampaigns.status, "active"),
        eq(contacts.status, "active")
      )
    );

  let queuedCampaignCount = 0;
  if (resetQueueCount === 0) {
    for (const { campaign, contact } of activeCampaigns) {
      try {
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
              mediaMimeType: campaign.mediaMimeType,
            };

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

        await db
          .update(contactCampaigns)
          .set({
            lastSentAt: now,
            updatedAt: now,
          })
          .where(eq(contactCampaigns.id, campaign.id));

        queuedCampaignCount++;
      } catch (err) {
        console.error(`[RetryContactCampaigns] Error queuing campaign ${campaign.id}:`, err);
      }
    }
  }

  res.json({
    success: true,
    message: resetQueueCount > 0 
      ? `Retried ${resetQueueCount} failed message(s)`
      : `Queued ${queuedCampaignCount} recurring campaign message(s) for immediate send`,
    retriedCount: resetQueueCount > 0 ? resetQueueCount : queuedCampaignCount,
  });
});

export const getChannelContactCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { channelId } = req.params;
  if (!channelId) {
    return res.status(400).json({ error: "Channel ID is required" });
  }

  const results = await db
    .select({
      id: contactCampaigns.id,
      name: contactCampaigns.name,
      contactId: contactCampaigns.contactId,
      channelId: contactCampaigns.channelId,
      templateId: contactCampaigns.templateId,
      templateName: contactCampaigns.templateName,
      templateLanguage: contactCampaigns.templateLanguage,
      customMessage: contactCampaigns.customMessage,
      mediaUrl: contactCampaigns.mediaUrl,
      mediaMimeType: contactCampaigns.mediaMimeType,
      mediaName: contactCampaigns.mediaName,
      variableMapping: contactCampaigns.variableMapping,
      frequency: contactCampaigns.frequency,
      scheduledDate: contactCampaigns.scheduledDate,
      nextSendAt: contactCampaigns.nextSendAt,
      lastSentAt: contactCampaigns.lastSentAt,
      status: contactCampaigns.status,
      createdAt: contactCampaigns.createdAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
    })
    .from(contactCampaigns)
    .innerJoin(contacts, eq(contacts.id, contactCampaigns.contactId))
    .where(eq(contactCampaigns.channelId, channelId))
    .orderBy(desc(contactCampaigns.createdAt));

  // Retrieve latest status from messageQueue for each contact phone
  const phones = results.map(r => r.contactPhone).filter(Boolean);
  let latestQueueMap: Record<string, { status: string; errorMessage: string | null; createdAt: Date | null }> = {};
  let totalFailedCount = 0;

  if (phones.length > 0) {
    const queueItems = await db
      .select({
        recipientPhone: messageQueue.recipientPhone,
        status: messageQueue.status,
        errorMessage: messageQueue.errorMessage,
        createdAt: messageQueue.createdAt,
      })
      .from(messageQueue)
      .where(
        and(
          eq(messageQueue.channelId, channelId),
          inArray(messageQueue.recipientPhone, phones)
        )
      )
      .orderBy(desc(messageQueue.createdAt));

    for (const item of queueItems) {
      if (!latestQueueMap[item.recipientPhone]) {
        latestQueueMap[item.recipientPhone] = {
          status: item.status || "queued",
          errorMessage: item.errorMessage,
          createdAt: item.createdAt,
        };
      }
    }

    const failedCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(messageQueue)
      .where(
        and(
          eq(messageQueue.channelId, channelId),
          eq(messageQueue.status, "failed")
        )
      );
    totalFailedCount = Number(failedCountResult[0]?.count || 0);
  }

  const enriched = results.map(r => {
    const queueInfo = latestQueueMap[r.contactPhone];
    return {
      ...r,
      lastMessageStatus: queueInfo?.status || null,
      lastErrorMessage: queueInfo?.errorMessage || null,
    };
  });

  res.json({
    campaigns: enriched,
    failedCount: totalFailedCount,
  });
});

export const getContactCampaignTemplates = asyncHandler(async (req: Request, res: Response) => {
  const channelId = req.query.channelId as string;
  if (!channelId) {
    return res.status(400).json({ error: "Channel ID is required" });
  }
  const templates = await storage.getContactCampaignTemplates(channelId);
  res.json(templates);
});

export const deleteContactCampaignTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Template ID is required" });
  }
  const success = await storage.deleteContactCampaignTemplate(id);
  res.json({ success });
});
