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

import { asyncHandler } from "../utils/async-handler";
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { storage } from "../storage";
import { z } from "zod";
import type { Contact } from "@shared/schema";
import { randomUUID } from "crypto";
import { WhatsAppApiService } from "../services/whatsapp-api";
import { triggerNotification, NOTIFICATION_EVENTS } from "../services/notification.service";
import { db, dbRead } from "../db";
import { channels, messageQueue, users, contacts as contactsTable, campaignRecipients } from "@shared/schema";
import { eq, and, or, isNull, lte, inArray } from "drizzle-orm";
import { parseMessagingTier } from "../utils/messaging-tiers";

export { parseMessagingTier };

async function notifyCampaignCompletion(campaignId: string) {
  try {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign || !campaign.channelId) return;

    const channel = await dbRead.select().from(channels).where(eq(channels.id, campaign.channelId)).limit(1);
    const channelName = channel[0]?.name || "Unknown";
    if (!channel[0]?.createdBy) return;
    const ownerId = channel[0].createdBy;
    const ownerAndTeam = await dbRead.select().from(users).where(eq(users.id, ownerId));
    const teamMembers = await dbRead.select().from(users).where(eq(users.createdBy, ownerId));
    const allUsers = [...ownerAndTeam, ...teamMembers];
    const targetUserIds = [...new Set(allUsers.map((u) => u.id))];
    if (targetUserIds.length === 0) return;

    const hasFailed = (campaign.failedCount || 0) > (campaign.sentCount || 0);
    const eventType = hasFailed ? NOTIFICATION_EVENTS.CAMPAIGN_FAILED : NOTIFICATION_EVENTS.CAMPAIGN_COMPLETED;

    await triggerNotification(eventType, {
      campaignName: campaign.name || "Untitled Campaign",
      totalSent: String(campaign.sentCount || 0),
      deliveredCount: String((campaign.sentCount || 0) - (campaign.failedCount || 0)),
      failedCount: String(campaign.failedCount || 0),
      errorMessage: hasFailed ? "Some messages could not be delivered" : "",
      channelName,
    }, targetUserIds, campaign.channelId || undefined);
  } catch (err) {
    console.error("Error sending campaign completion notification:", err);
  }
}

const variableValueSchema = z.object({
  type: z.enum(["firstName", "lastName", "fullName", "phone", "custom"]),
  value: z.string().optional(),
});

const buttonMappingSchema = z.record(z.object({
  type: z.string().optional(),
  value: z.string().optional(),
}));

const variableMappingSchema = z.object({
  buttons: buttonMappingSchema.optional(),
  headerVars: z.record(variableValueSchema).optional(),
  uploadedMediaId: z.string().optional(),
  headerType: z.string().optional(),
  expirationTimeMs: z.number().optional(),
  carouselCardMediaIds: z.record(z.string()).optional(),
}).catchall(variableValueSchema);

const createCampaignSchema = z.object({
  channelId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  campaignType: z.enum(["contacts", "csv", "api"]),
  type: z.enum(["marketing", "transactional"]),
  apiType: z.enum(["cloud_api", "marketing_messages", "mm_lite", "qr_code"]),
  templateId: z.string().optional().nullable(),
  templateName: z.string().optional().nullable(),
  templateLanguage: z.string().optional().nullable(),
  variableMapping: variableMappingSchema.optional(),
  status: z.string(),
  scheduledAt: z
    .string()
    .datetime({ offset: true, message: "scheduledAt must be a valid ISO 8601 datetime string with a timezone offset (e.g. 2026-04-08T09:30:00.000Z). Bare local datetime strings are not accepted." })
    .nullable(),
  contactGroups: z.array(z.string()).optional(),
  csvData: z.array(z.any()).optional(),
  recipientCount: z.number(),
  autoRetry: z.boolean().optional(),
  customMessage: z.string().optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
  mediaMimeType: z.string().optional().nullable(),
  mediaName: z.string().optional().nullable(),
  delayBetweenMessages: z.number().optional(),
  chunkSize: z.number().optional(),
  delayBetweenChunks: z.number().optional(),
  warmerEnabled: z.boolean().optional(),
  selectedWarmerMessages: z.array(z.string()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["paused", "sending"], {
    errorMap: () => ({ message: "Status must be 'paused' or 'sending'. Use other endpoints for draft/active/completed transitions." }),
  }),
});

export const campaignsController = {
  // Get all campaigns
  getCampaigns: asyncHandler(async (req, res) => {
    const channelId = req.headers["x-channel-id"] as string;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const user = (req.session as any)?.user;

    if (channelId) {
      if (user && user.role !== 'superadmin') {
        const ownerId = user.role === 'team' ? user.createdBy : user.id;
        const channels = await storage.getChannelsByUserId(ownerId);
        const channelIds = channels.map((ch: any) => ch.id);
        if (!channelIds.includes(channelId)) {
          return res.status(403).json({ error: 'Access denied to this channel' });
        }
      }
      const campaigns = await storage.getCampaignsByChannel(channelId, page, limit);
      res.json(campaigns);
    } else if (user && user.role === 'superadmin') {
      const campaigns = await storage.getCampaigns(page, limit);
      res.json(campaigns);
    } else {
      const ownerId = user?.role === 'team' ? user?.createdBy : user?.id;
      if (!ownerId) return res.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      const channels = await storage.getChannelsByUserId(ownerId);
      if (channels.length === 0) return res.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      const campaigns = await storage.getCampaignsByChannel(channels[0].id, page, limit);
      res.json(campaigns);
    }
  }),

  // Get campaign by ID
  getCampaign: asyncHandler(async (req, res) => {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    const user = (req.session as any)?.user;
    if (user && user.role !== 'superadmin' && campaign.channelId) {
      const ownerId = user.role === 'team' ? user.createdBy : user.id;
      const channels = await storage.getChannelsByUserId(ownerId);
      const channelIds = channels.map((ch: any) => ch.id);
      if (!channelIds.includes(campaign.channelId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    res.json(campaign);
  }),


 getCampaignByUserID: asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const user = (req.session as any)?.user;

  if (user && user.role !== 'superadmin') {
    const ownerId = user.role === 'team' ? user.createdBy : user.id;
    if (userId !== ownerId && userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  const page = Number(req.body.page) || 1;
  const limit = Number(req.body.limit) || 10;

  const campaign = await storage.getCampaignByUserId(userId, page, limit);

  res.json(campaign);
}),



  createCampaign: asyncHandler(async (req, res) => {
  const data = createCampaignSchema.parse(req.body);

  if (!req.user?.id) {
    return res
      .status(401)
      .json({ status: "error", message: "User not authenticated" });
  }

  const createdBy = req.user.id;

  let apiKey: string | undefined;
  let apiEndpoint: string | undefined;
  if (data.campaignType === "api") {
    apiKey = `ww_${randomUUID().replace(/-/g, "")}`;
    apiEndpoint = `${req.protocol}://${req.get("host")}/api/campaigns/send/${apiKey}`;
  }

  let contactIds: string[] = [];
  if (data.campaignType === "csv" && data.csvData) {
    for (const row of data.csvData) {
      if (row.phone) {
        let contact = await storage.getContactByPhoneAndChannel(row.phone, data.channelId);
        if (!contact) {
          contact = await storage.createContact({
            channelId: data.channelId,
            name: row.name || row.phone,
            phone: row.phone,
            email: row.email || null,
            groups: ["csv_import"],
            tags: [`campaign_${data.name}`],
          });
        } else {
          const currentTags: string[] = (contact.tags as string[]) || [];
          const campaignTag = `campaign_${data.name}`;
          if (!currentTags.includes(campaignTag)) {
            await storage.updateContact(contact.id, {
              tags: [...currentTags, campaignTag],
            });
          }
        }
        contactIds.push(contact.id);
      }
    }
  } else if (data.campaignType === "contacts") {
    contactIds = data.contactGroups || [];
  }

  const recipientCount = contactIds.length;

  const channel = await storage.getChannel(data.channelId);
  if (!channel) {
    return res.status(400).json({ error: "Channel not found" });
  }
  const messagingLimit = parseMessagingTier(
    (channel.healthDetails as any)?.messaging_limit
  );
  if (messagingLimit !== Infinity && recipientCount > messagingLimit) {
    const lastCheckedHint = channel.lastHealthCheck
      ? (() => {
          const diffMs = Date.now() - new Date(channel.lastHealthCheck).getTime();
          const diffHours = Math.round(diffMs / 3_600_000);
          const diffDays = Math.round(diffMs / 86_400_000);
          const ago =
            diffHours < 1
              ? "less than an hour ago"
              : diffHours < 24
              ? `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
              : `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
          return ` Last checked ${ago} — run a health check in Channel Settings to refresh your tier.`;
        })()
      : " Run a health check in Channel Settings to confirm your tier.";
    return res.status(400).json({
      error: `Your channel's messaging limit is ${messagingLimit.toLocaleString()} messages per 24 hours. You selected ${recipientCount.toLocaleString()} recipients. Please reduce the number of contacts or upgrade your WhatsApp tier.${lastCheckedHint}`,
      lastChecked: channel.lastHealthCheck ?? null,
    });
  }

  // Build campaign object (to save + for runner)
  const campaignDataToSave = {
    ...data,
    apiKey,
    apiEndpoint,
    recipientCount,
    contactGroups: contactIds,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    variableMapping: data.variableMapping,
    createdBy,
  };

  // Save campaign to DB
  const campaign = await storage.createCampaign(campaignDataToSave);

  // If active and not scheduled, start campaign immediately (fully detached — response already sent)
  res.json(campaign);
  if (data.status === "active" && !data.scheduledAt) {
    void startCampaignExecution(campaign.id, {
      ...campaign,
      ...campaignDataToSave,
    }).catch((err) => {
      console.error(`[Campaign ${campaign.id}] Error from detached startCampaignExecution:`, err);
      storage.updateCampaign(campaign.id, { status: "failed" }).catch(() => {});
    });
  }
}),

  // Update campaign status
  updateCampaignStatus: asyncHandler(async (req, res) => {
    const { status } = updateStatusSchema.parse(req.body);

    const existing = await storage.getCampaign(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (status === "paused" && existing.status !== "sending") {
      return res.status(400).json({
        error: `Cannot pause a campaign with status "${existing.status}". Only sending campaigns can be paused.`,
      });
    }

    if (status === "sending" && existing.status !== "paused") {
      return res.status(400).json({
        error: `Cannot resume a campaign with status "${existing.status}". Only paused campaigns can be resumed.`,
      });
    }

    const campaign = await storage.updateCampaign(req.params.id, { status });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(campaign);
  }),

  // Delete campaign
  deleteCampaign: asyncHandler(async (req, res) => {
    const deleted = await storage.deleteCampaign(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    res.json({ success: true });
  }),

  // Start campaign execution
  startCampaign: asyncHandler(async (req, res) => {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    await storage.updateCampaign(campaign.id, { status: "active" });
    res.json({ success: true, message: "Campaign queued for sending" });

    void startCampaignExecution(campaign.id).catch((err) => {
      console.error(`[Campaign ${campaign.id}] Error from detached startCampaignExecution:`, err);
      storage.updateCampaign(campaign.id, { status: "failed" }).catch(() => {});
    });
  }),

  // Get campaign analytics
  getCampaignAnalytics: asyncHandler(async (req, res) => {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (!campaign.deliveredCount) {
      return res
        .status(400)
        .json({ error: "No messages delivered yet for this campaign" });
    }
    if (!campaign.sentCount) {
      return res
        .status(400)
        .json({ error: "No messages sent yet for this campaign" });
    }
    if (!campaign.recipientCount) {
      return res
        .status(400)
        .json({ error: "No recipients found for this campaign" });
    }
    if (!campaign.readCount) {
      return res
        .status(400)
        .json({ error: "No messages read yet for this campaign" });
    }

    // Return campaign metrics
    res.json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      metrics: {
        recipientCount: campaign.recipientCount,
        sentCount: campaign.sentCount,
        deliveredCount: campaign.deliveredCount,
        readCount: campaign.readCount,
        repliedCount: campaign.repliedCount,
        failedCount: campaign.failedCount,
        deliveryRate: campaign.sentCount
          ? ((campaign.deliveredCount / campaign.recipientCount) * 100).toFixed(
              2
            )
          : 0,
        readRate: campaign.deliveredCount
          ? ((campaign.readCount / campaign.deliveredCount) * 100).toFixed(2)
          : 0,
      },
      createdAt: campaign.createdAt,
      completedAt: campaign.completedAt,
    });
  }),

  // API campaign endpoint
  sendApiCampaign: asyncHandler(async (req, res) => {
    const { apiKey } = req.params;

    // Find campaign by API key
    const campaigns = await storage.getCampaigns();
    const campaign = campaigns.find((c) => c.apiKey === apiKey);

    if (!campaign || campaign.campaignType !== "api") {
      return res.status(401).json({ error: "Invalid API key" });
    }

    if (campaign.status !== "active") {
      return res.status(400).json({ error: "Campaign is not active" });
    }

    // Get channel
    if (!campaign.channelId) {
      return res
        .status(400)
        .json({ error: "Channel ID is missing in campaign" });
    }
    const channel = await storage.getChannel(campaign.channelId);
    if (!channel) {
      return res.status(400).json({ error: "Channel not found" });
    }

    // Parse request body
    const { phone, variables = {} } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Get template

    if (!campaign.templateId) {
      return res
        .status(400)
        .json({ error: "Template ID is missing in campaign" });
    }
    const template = await storage.getTemplate(campaign.templateId);
    if (!template) {
      return res.status(400).json({ error: "Template not found" });
    }

    // Build WhatsApp API components from variableMapping + variables
    const apiComponents: any[] = [];
    const mapping = campaign.variableMapping as any;

    const apiCarouselCards = Array.isArray(template.carouselCards) && template.carouselCards.length > 0
      ? template.carouselCards as any[]
      : null;

    let apiHasLto = false;
    if (template.whatsappTemplateId) {
      try {
        const ltoResp = await fetch(
          `https://graph.facebook.com/v24.0/${template.whatsappTemplateId}`,
          { headers: { Authorization: `Bearer ${channel.accessToken}` } }
        );
        const ltoMeta = await ltoResp.json();
        apiHasLto = (ltoMeta.components || []).some(
          (c: any) => c.type === "LIMITED_TIME_OFFER"
        );
      } catch (err) {
        console.warn("⚠️ Failed to check LTO status for API campaign:", err);
      }
    }
    if (apiHasLto) {
      apiComponents.push({
        type: "limited_time_offer",
        parameters: [
          {
            type: "limited_time_offer",
            limited_time_offer: {
              expiration_time_ms: Date.now() + 24 * 60 * 60 * 1000,
            },
          },
        ],
      });
    }

    // BODY variables
    const bodyText = template.body || "";
    const bodyVarMatches = bodyText.match(/\{\{\d+\}\}/g) || [];
    if (bodyVarMatches.length > 0) {
      const bodyComp: any = { type: "body", parameters: [] };
      for (const varText of bodyVarMatches) {
        const idx = varText.replace(/\D/g, "");
        const mapObj = mapping?.[idx];
        let value = "";
        if (mapObj?.type === "custom") {
          value = mapObj.value || variables?.[mapObj.value] || "";
        } else if (mapObj?.type && variables) {
          value = variables[mapObj.type] || "";
        } else if (variables) {
          value = variables[idx] || "";
        }
        bodyComp.parameters.push({ type: "text", text: value });
      }
      apiComponents.push(bodyComp);
    }

    // HEADER media — skip for carousel templates (cards have their own headers)
    if (template.mediaUrl && !apiCarouselCards) {
      const mediaType = (template.mediaType || "image").toLowerCase();
      if (mediaType === "image") {
        apiComponents.push({ type: "header", parameters: [{ type: "image", image: { id: cleanMediaId(template.mediaUrl) } }] });
      } else if (mediaType === "video") {
        apiComponents.push({ type: "header", parameters: [{ type: "video", video: { id: cleanMediaId(template.mediaUrl) } }] });
      } else if (mediaType === "document") {
        apiComponents.push({ type: "header", parameters: [{ type: "document", document: { id: cleanMediaId(template.mediaUrl) } }] });
      }
    }

    // BUTTONS
    if (Array.isArray(template.buttons)) {
      template.buttons.forEach((button: any, index: number) => {
        if (button.type === "URL" && button.url?.includes("{{")) {
          const btnMap = mapping?.buttons?.[index.toString()];
          apiComponents.push({
            type: "button", sub_type: "url", index: index.toString(),
            parameters: [{ type: "text", text: btnMap?.value || variables?.[`button_${index}`] || "" }],
          });
        } else if (button.type === "COPY_CODE") {
          const btnMap = mapping?.buttons?.[index.toString()];
          apiComponents.push({
            type: "button", sub_type: "copy_code", index: index.toString(),
            parameters: [{ type: "coupon_code", coupon_code: btnMap?.value || button.example?.[0] || "" }],
          });
        }
      });
    }

    if (apiCarouselCards) {
      const carouselComp: any = { type: "carousel", cards: [] };
      for (let cardIdx = 0; cardIdx < apiCarouselCards.length; cardIdx++) {
        const card = apiCarouselCards[cardIdx];
        const cardComponents: any[] = [];

        const cardMediaType = (card.mediaType || "image").toLowerCase();
        if (card.mediaUrl) {
          const isUrl = card.mediaUrl.startsWith("http");
          const mediaRef = isUrl ? { link: card.mediaUrl } : { id: cleanMediaId(card.mediaUrl) };
          cardComponents.push({
            type: "header",
            parameters: [
              cardMediaType === "video"
                ? { type: "video", video: mediaRef }
                : { type: "image", image: mediaRef },
            ],
          });
        }

        const cardBody = card.body || "";
        const cardBodyVars = cardBody.match(/\{\{\d+\}\}/g) || [];
        if (cardBodyVars.length > 0) {
          const cardBodyComp: any = { type: "body", parameters: [] };
          for (const varText of cardBodyVars) {
            const varIdx = varText.replace(/\D/g, "");
            const varValue = variables?.[`card_${cardIdx}_body_${varIdx}`] || "";
            cardBodyComp.parameters.push({ type: "text", text: varValue });
          }
          cardComponents.push(cardBodyComp);
        }

        if (Array.isArray(card.buttons)) {
          card.buttons.forEach((btn: any, btnIdx: number) => {
            if (btn.type === "QUICK_REPLY") {
              cardComponents.push({
                type: "button",
                sub_type: "quick_reply",
                index: btnIdx.toString(),
                parameters: [{ type: "payload", payload: variables?.[`card_${cardIdx}_button_${btnIdx}`] || btn.text || "" }],
              });
            } else if (btn.type === "URL" && btn.url?.includes("{{")) {
              cardComponents.push({
                type: "button",
                sub_type: "url",
                index: btnIdx.toString(),
                parameters: [{ type: "text", text: variables?.[`card_${cardIdx}_button_${btnIdx}`] || "" }],
              });
            }
          });
        }

        carouselComp.cards.push({ card_index: cardIdx, components: cardComponents });
      }
      apiComponents.push(carouselComp);
    }

    try {
      const response = await WhatsAppApiService.sendTemplateMessage(
        channel,
        phone,
        template.name,
        apiComponents,
        template.language || "en_US",
        true
      );
      const messageId = response.messages?.[0]?.id || `msg_${randomUUID()}`;
      const sentVia = response._sentVia || "cloud_api";

      let conversation = await storage.getConversationByPhone(phone);
      if (!conversation) {
        let contact = await storage.getContactByPhone(phone);
        if (!contact) {
          contact = await storage.createContact({
            name: phone,
            phone: phone,
            channelId: channel.id,
          });
        }
        conversation = await storage.createConversation({
          contactId: contact.id,
          contactPhone: phone,
          contactName: contact.name || phone,
          channelId: channel.id,
          unreadCount: 0,
        });
      }

      const createdMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: template.body || "",
        status: "sent",
        whatsappMessageId: messageId,
        messageType: "text",
        metadata: { apiEndpoint: sentVia },
      });

      // await storage.createMessage({
      //   conversationId: null, // API messages may not have conversation
      //   to: phone,
      //   from: channel.phoneNumber,
      //   type: "template",
      //   content: JSON.stringify({
      //     templateId: template.id,
      //     templateName: template.name,
      //     parameters: templateParams,
      //   }),
      //   status: "sent",
      //   direction: "outbound",
      //   whatsappMessageId: messageId,
      //   timestamp: new Date(),
      //   campaignId: campaign.id,
      // });

      // Update campaign stats
      await storage.updateCampaign(campaign.id, {
        sentCount: (campaign.sentCount || 0) + 1,
      });

      res.json({
        success: true,
        messageId,
        message: "Message sent successfully",
      });
    } catch (error: any) {
      // Update failed count
      await storage.updateCampaign(campaign.id, {
        failedCount: (campaign.failedCount || 0) + 1,
      });

      res.status(500).json({
        error: "Failed to send message",
        details: error.message,
      });
    }
  }),
};


const cleanMediaId = (id: any) => (id ? String(id).trim() : id);

function resolveVariableValue(mapObj: any, contact: Contact): string {
  if (!mapObj) return "";
  const typeKey = mapObj.type;
  const valKey = mapObj.value;

  if (typeKey === "firstName") {
    return contact.firstName || contact.name || "";
  } else if (typeKey === "lastName") {
    return contact.lastName || "";
  } else if (typeKey === "fullName") {
    return (contact.firstName || contact.name || "") + (contact.lastName ? " " + contact.lastName : "");
  } else if (typeKey === "phone") {
    return contact.phone;
  } else if (contact.variables && typeof contact.variables === "object" && typeKey && (contact.variables as Record<string, any>)[typeKey] !== undefined) {
    return (contact.variables as Record<string, any>)[typeKey] || "";
  } else if (typeKey === "custom") {
    if (contact.variables && typeof contact.variables === "object" && valKey && (contact.variables as Record<string, any>)[valKey] !== undefined) {
      return (contact.variables as Record<string, any>)[valKey] || "";
    }
    return valKey || "";
  } else if (valKey) {
    if (contact.variables && typeof contact.variables === "object" && (contact.variables as Record<string, any>)[valKey] !== undefined) {
      return (contact.variables as Record<string, any>)[valKey] || "";
    }
    return valKey;
  }
  return "";
}

function buildContactComponents(contact: Contact, campaign: any, template: any, hasLimitedTimeOffer: boolean): any[] {
  const components: any[] = [];

  const carouselCards = Array.isArray(template.carouselCards) && template.carouselCards.length > 0
    ? template.carouselCards as any[]
    : null;

  const headerMediaId = campaign.variableMapping?.uploadedMediaId || template.mediaUrl;
  if (headerMediaId && !carouselCards) {
    const mediaType = (campaign.variableMapping?.headerType || template.mediaType || "image").toLowerCase();
    if (mediaType === "image") {
      components.push({ type: "header", parameters: [{ type: "image", image: { id: cleanMediaId(headerMediaId) } }] });
    } else if (mediaType === "video") {
      components.push({ type: "header", parameters: [{ type: "video", video: { id: cleanMediaId(headerMediaId) } }] });
    } else if (mediaType === "document") {
      components.push({ type: "header", parameters: [{ type: "document", document: { id: cleanMediaId(headerMediaId) } }] });
    }
  }

  const headerText = template.header || "";
  const headerVars = headerText.match(/\{\{\d+\}\}/g) || [];
  if (headerVars.length > 0 && !template.mediaUrl && !carouselCards) {
    const headerComponent: any = { type: "header", parameters: [] };
    for (const varText of headerVars) {
      const index = varText.replace(/\D/g, "");
      const mapObj = campaign.variableMapping?.headerVars?.[index];
      const textValue = resolveVariableValue(mapObj, contact);
      headerComponent.parameters.push({ type: "text", text: textValue });
    }
    components.push(headerComponent);
  }

  if (hasLimitedTimeOffer) {
    const expirationMs = Date.now() + 24 * 60 * 60 * 1000;
    components.push({
      type: "limited_time_offer",
      parameters: [{ type: "limited_time_offer", limited_time_offer: { expiration_time_ms: expirationMs } }],
    });
  }

  const bodyText = template.body || "";
  const bodyVars = bodyText.match(/\{\{\d+\}\}/g) || [];
  if (bodyVars.length > 0) {
    const bodyComponent: any = { type: "body", parameters: [] };
    for (const varText of bodyVars) {
      const index = varText.replace(/\D/g, "");
      const mapObj = campaign.variableMapping?.[index];
      const textValue = resolveVariableValue(mapObj, contact);
      bodyComponent.parameters.push({ type: "text", text: textValue });
    }
    components.push(bodyComponent);
  }

  if (Array.isArray(template.buttons)) {
    template.buttons.forEach((button: any, index: number) => {
      if (button.type === "URL" && button.url?.includes("{{")) {
        const mapObj = campaign.variableMapping?.buttons?.[index.toString()];
        const textValue = resolveVariableValue(mapObj, contact);
        components.push({ type: "button", sub_type: "url", index: index.toString(), parameters: [{ type: "text", text: textValue }] });
      } else if (button.type === "COPY_CODE") {
        const mapObj = campaign.variableMapping?.buttons?.[index.toString()];
        const couponCode = resolveVariableValue(mapObj, contact) || button.example?.[0] || "";
        components.push({ type: "button", sub_type: "copy_code", index: index.toString(), parameters: [{ type: "coupon_code", coupon_code: couponCode }] });
      }
    });
  }

  if (carouselCards) {
    const carouselComponent: any = { type: "carousel", cards: [] };
    for (let cardIdx = 0; cardIdx < carouselCards.length; cardIdx++) {
      const card = carouselCards[cardIdx];
      const cardComponents: any[] = [];
      const cardMediaType = (card.mediaType || "image").toLowerCase();

      // Prefer campaign-uploaded media ID over template sample media URL
      const campaignMediaId =
        campaign.variableMapping?.carouselCardMediaIds?.[cardIdx.toString()] ||
        campaign.variableMapping?.carouselCardMediaIds?.[cardIdx];
      const resolvedMediaUrl = campaignMediaId || card.mediaUrl;

      if (resolvedMediaUrl) {
        const isUrl = !campaignMediaId && resolvedMediaUrl.startsWith("http");
        const mediaRef = isUrl ? { link: resolvedMediaUrl } : { id: cleanMediaId(resolvedMediaUrl) };
        cardComponents.push({
          type: "header",
          parameters: [cardMediaType === "video" ? { type: "video", video: mediaRef } : { type: "image", image: mediaRef }],
        });
      }
      const cardBody = card.body || "";
      const cardBodyVars = cardBody.match(/\{\{\d+\}\}/g) || [];
      if (cardBodyVars.length > 0) {
        const cardBodyComp: any = { type: "body", parameters: [] };
        for (const varText of cardBodyVars) {
          const varIdx = varText.replace(/\D/g, "");
          const mapObj = campaign.variableMapping?.carouselCards?.[cardIdx]?.bodyVars?.[varIdx];
          let textValue = "";
          if (mapObj) {
            if (mapObj.type === "custom") textValue = mapObj.value || "";
            else if (mapObj.type === "firstName") textValue = contact.firstName || contact.name || "";
            else if (mapObj.type === "lastName") textValue = contact.lastName || "";
            else if (mapObj.type === "fullName") textValue = (contact.firstName || contact.name || "") + (contact.lastName ? " " + contact.lastName : "");
            else if (mapObj.type === "phone") textValue = contact.phone;
          }
          cardBodyComp.parameters.push({ type: "text", text: textValue });
        }
        cardComponents.push(cardBodyComp);
      }
      if (Array.isArray(card.buttons)) {
        card.buttons.forEach((btn: any, btnIdx: number) => {
          if (btn.type === "QUICK_REPLY") {
            const mapObj = campaign.variableMapping?.carouselCards?.[cardIdx]?.buttons?.[btnIdx];
            cardComponents.push({ type: "button", sub_type: "quick_reply", index: btnIdx.toString(), parameters: [{ type: "payload", payload: mapObj?.value || btn.text || "" }] });
          } else if (btn.type === "URL" && btn.url?.includes("{{")) {
            const mapObj = campaign.variableMapping?.carouselCards?.[cardIdx]?.buttons?.[btnIdx];
            cardComponents.push({ type: "button", sub_type: "url", index: btnIdx.toString(), parameters: [{ type: "text", text: mapObj?.value || "" }] });
          }
        });
      }
      if (cardComponents.length === 0) {
        throw new Error(
          `Carousel card ${cardIdx + 1} has no media: no campaign-uploaded media ID and no stored ` +
          `mediaUrl on the template card. Re-sync your templates or re-create the carousel template ` +
          `so the sample media handle is saved.`
        );
      }
      carouselComponent.cards.push({ card_index: cardIdx, components: cardComponents });
    }
    components.push(carouselComponent);
  }

  return components;
}

export async function startCampaignExecution(
  campaignId: string,
  overrideCampaign?: any
) {
  console.log(`[Campaign ${campaignId}] Received start request — queuing in background`);

  const campaign = overrideCampaign ?? (await storage.getCampaign(campaignId));

  if (!campaign) {
    console.error(`[Campaign ${campaignId}] Campaign not found`);
    return;
  }

  if (campaign.status !== "active") {
    console.warn(`[Campaign ${campaignId}] Skipping — status is "${campaign.status}", expected "active"`);
    return;
  }

  await storage.updateCampaign(campaignId, { status: "queued", populationStartedAt: new Date() });

  setImmediate(() => {
    void _runCampaignQueuePopulation(campaignId, campaign).catch((err) => {
      console.error(`[Campaign ${campaignId}] Fatal error during queue population:`, err);
      storage.updateCampaign(campaignId, { status: "failed", populationStartedAt: null }).catch(() => {});
    });
  });
}

async function _runCampaignQueuePopulation(campaignId: string, campaignData: any) {
  console.log(`[Campaign ${campaignId}] Starting queue population`);

  const campaign = await storage.getCampaign(campaignId);
  if (!campaign) {
    console.error(`[Campaign ${campaignId}] Campaign not found during population`);
    return;
  }

  const channel = await storage.getChannel(campaign.channelId!);
  if (!channel) {
    console.error(`[Campaign ${campaignId}] Channel not found: ${campaign.channelId}`);
    await storage.updateCampaign(campaignId, { status: "failed", populationStartedAt: null });
    return;
  }

  const isQr = channel.connectionMethod === "qr_code";
  let template = null;
  let hasLimitedTimeOffer = false;

  if (!isQr) {
    template = await storage.getTemplate(campaign.templateId!);
    if (!template) {
      console.error(`[Campaign ${campaignId}] Template not found: ${campaign.templateId}`);
      await storage.updateCampaign(campaignId, { status: "failed", populationStartedAt: null });
      return;
    }

    if (template.whatsappTemplateId) {
      try {
        const metaResp = await fetch(
          `https://graph.facebook.com/v24.0/${template.whatsappTemplateId}`,
          { headers: { Authorization: `Bearer ${channel.accessToken}` } }
        );
        const metaData = await metaResp.json();
        hasLimitedTimeOffer = (metaData.components || []).some(
          (c: any) => c.type === "LIMITED_TIME_OFFER"
        );
      } catch (err) {
        console.warn(`[Campaign ${campaignId}] Failed to check LTO status from Meta:`, err);
      }
    }
  }

  let contacts: Contact[] = [];
  if ((campaign.campaignType === "contacts" || campaign.campaignType === "csv") && campaign.contactGroups) {
    const contactIds = campaign.contactGroups as string[];
    contacts = await storage.getContactsByIds(contactIds);
  }

  console.log(`[Campaign ${campaignId}] Loaded ${contacts.length} contacts — inserting into queue`);

  if (contacts.length === 0) {
    await storage.updateCampaign(campaignId, { status: "completed", completedAt: new Date(), populationStartedAt: null });
    console.log(`[Campaign ${campaignId}] No contacts to send — marked completed`);
    return;
  }

  const chunkSize = campaign.chunkSize || 50;
  const delayBetweenMessages = campaign.delayBetweenMessages || 10;
  const delayBetweenChunks = campaign.delayBetweenChunks || 60; // in minutes
  const warmerEnabled = campaign.warmerEnabled || false;
  const warmerMessagesList = campaign.selectedWarmerMessages || [];

  // Get other contacts on this channel to use as warmer recipients
  let warmerRecipients: string[] = [];
  if (warmerEnabled && warmerMessagesList.length > 0) {
    try {
      const allChannelContacts = await db
        .select()
        .from(contactsTable)
        .where(eq(contactsTable.channelId, channel.id));
      
      const campaignPhoneSet = new Set(contacts.map((c: any) => c.phone));
      warmerRecipients = allChannelContacts
        .map((c: any) => c.phone)
        .filter((phone: string) => !campaignPhoneSet.has(phone));
      
      if (warmerRecipients.length === 0 && allChannelContacts.length > 0) {
        warmerRecipients = allChannelContacts.map((c: any) => c.phone);
      }
    } catch (wErr) {
      console.warn(`[Campaign ${campaignId}] Failed to query warmer contacts:`, wErr);
    }
  }

  let currentTime = new Date();
  if (campaign.scheduledAt) {
    currentTime = new Date(campaign.scheduledAt);
  }

  let totalQueued = 0;
  let totalFailed = 0;
  let lastHeartbeat = Date.now();
  const rows: any[] = [];
  const recipientRows: any[] = [];

  for (let i = 0; i < contacts.length; i += chunkSize) {
    const chunk = contacts.slice(i, i + chunkSize);
    const chunkRows: any[] = [];

    chunk.forEach((contact) => {
      try {
        let components: any[] = [];
        if (!isQr && template) {
          components = buildContactComponents(contact, campaign, template, hasLimitedTimeOffer);
        }
        chunkRows.push({
          campaignId,
          channelId: channel.id,
          recipientPhone: contact.phone,
          templateName: isQr ? null : template!.name,
          templateLanguage: isQr ? null : ((campaign as any).templateLanguage || "en_US"),
          templateParams: components,
          messageType: "marketing",
          status: "queued" as const,
        });
        recipientRows.push({
          campaignId,
          contactId: contact.id,
          phone: contact.phone,
          name: contact.name || null,
          status: "pending",
          templateParams: components,
        });
      } catch (err: any) {
        console.error(`[Campaign ${campaignId}] Failed to build components for ${contact.phone}: ${err.message}`);
        totalFailed++;
        chunkRows.push({
          campaignId,
          channelId: channel.id,
          recipientPhone: contact.phone,
          templateName: isQr ? null : template!.name,
          templateLanguage: isQr ? null : ((campaign as any).templateLanguage || "en_US"),
          templateParams: [],
          messageType: "marketing",
          status: "failed" as const,
        });
        recipientRows.push({
          campaignId,
          contactId: contact.id,
          phone: contact.phone,
          name: contact.name || null,
          status: "failed",
          errorCode: "BUILD_ERROR",
          errorMessage: err.message || "Failed to build template components",
        });
      }
    });

    // Intersperse warmer messages if enabled
    if (warmerEnabled && warmerMessagesList.length > 0 && warmerRecipients.length > 0) {
      // Interleave 1 warmer message per 10 campaign messages (min 1, max 5)
      const warmerCount = Math.min(5, Math.max(1, Math.floor(chunk.length / 10)));
      for (let w = 0; w < warmerCount; w++) {
        const randomPhone = warmerRecipients[Math.floor(Math.random() * warmerRecipients.length)];
        const randomText = warmerMessagesList[Math.floor(Math.random() * warmerMessagesList.length)];
        
        const insertIndex = Math.floor(Math.random() * (chunkRows.length + 1));
        chunkRows.splice(insertIndex, 0, {
          campaignId,
          channelId: channel.id,
          recipientPhone: randomPhone,
          templateName: null,
          templateLanguage: null,
          templateParams: { isWarmer: true, customMessage: randomText },
          messageType: "utility",
          status: "queued" as const,
        });
      }
    }

    // Assign scheduledFor time to all messages in this chunk
    chunkRows.forEach((row) => {
      if (row.status === "queued") {
        row.scheduledFor = new Date(currentTime.getTime());
        currentTime = new Date(currentTime.getTime() + delayBetweenMessages * 1000);
      } else {
        row.scheduledFor = null;
      }
      rows.push(row);
    });

    if (i + chunkSize < contacts.length) {
      currentTime = new Date(currentTime.getTime() + delayBetweenChunks * 60 * 1000);
    }
  }

  // Insert all in batches of 100
  const BATCH_SIZE_INSERT = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE_INSERT) {
    const batch = rows.slice(i, i + BATCH_SIZE_INSERT);
    await db.insert(messageQueue).values(batch);
    totalQueued += batch.filter(r => r.status === "queued" && !(r.templateParams && (r.templateParams as any).isWarmer)).length;

    if (Date.now() - lastHeartbeat > 60_000) {
      await storage.updateCampaign(campaignId, { populationStartedAt: new Date() });
      lastHeartbeat = Date.now();
    }
  }

  // Insert recipients in batches of 100
  for (let i = 0; i < recipientRows.length; i += BATCH_SIZE_INSERT) {
    const batch = recipientRows.slice(i, i + BATCH_SIZE_INSERT);
    await db.insert(campaignRecipients).values(batch);
  }

  console.log(`[Campaign ${campaignId}] Queued ${totalQueued}/${contacts.length}${totalFailed > 0 ? ` (${totalFailed} failed to build)` : ""}`);

  if (totalQueued === 0 && totalFailed > 0) {
    await storage.updateCampaign(campaignId, {
      status: "failed",
      completedAt: new Date(),
      failedCount: totalFailed,
      populationStartedAt: null,
    });
    console.error(`[Campaign ${campaignId}] All ${totalFailed} messages failed to build — campaign marked failed`);
    return;
  }

  await storage.updateCampaign(campaignId, { status: "sending", populationStartedAt: null });
  console.log(`[Campaign ${campaignId}] All ${totalQueued} messages queued — status set to "sending"`);
}


