/**
 * ============================================================
 * © 2026 LINALA — WhatsApp CRM & Marketing Platform
 * ============================================================
 */

import type { Request, Response } from "express";
import { asyncHandler } from "../middlewares/error.middleware";
import { storage } from "../storage";
import { db } from "../db";
import { contactCampaigns, insertContactCampaignSchema, contacts } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

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

  res.json(results);
});
