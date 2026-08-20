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

import type { Request, Response } from "express";
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { storage } from "../storage";
import {
  aiSettings,
  campaigns,
  campaignRecipients,
  insertMessageSchema,
  messageQueue,
  messages,
  subscriptions,
  transactions,
  webhookConfigs,
  plans,
  paymentProviders,
  sites,
  conversations,
  automationExecutions,
  automations,
} from "@shared/schema";
import { AppError, asyncHandler } from "../middlewares/error.middleware";
import crypto from "crypto";
import { startAutomationExecutionFunction } from "./automation.controller";
import { triggerService } from "server/services/automation-execution-service";
import { WhatsAppApiService } from "server/services/whatsapp-api";
import { searchTrainingData } from "../services/training.service";
import { getWhatsAppError } from "@shared/whatsapp-error-codes";
import { db } from "server/db";
import { and, desc, eq, sql, or, isNull, isNotNull } from "drizzle-orm";
import { sendPushNotification } from "../services/fcm-service";
import { triggerNotification, triggerThrottledNotification, NOTIFICATION_EVENTS } from "server/services/notification.service";
import { users } from "@shared/schema";
import axios from "axios";
import { getStripe, getRazorpay } from "../services/payment-gateway.service";
import { createDOClient } from "../config/digitalOceanConfig";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Webhook deduplication cache
// Prevents duplicate processing when Meta delivers the same event twice.
// Keys are WhatsApp message IDs (wamid); values are the timestamp (ms) when
// the event was first processed. Entries expire after DEDUP_TTL_MS.
// ---------------------------------------------------------------------------
const DEDUP_TTL_MS = 60_000; // 60 seconds

const _recentWebhookIds = new Map<string, number>();

function _isAlreadyProcessed(wamid: string): boolean {
  const now = Date.now();
  const seenAt = _recentWebhookIds.get(wamid);
  if (seenAt !== undefined && now - seenAt < DEDUP_TTL_MS) {
    return true;
  }
  // Mark as processed and prune stale entries on each write
  _recentWebhookIds.set(wamid, now);
  for (const [id, ts] of _recentWebhookIds) {
    if (now - ts >= DEDUP_TTL_MS) _recentWebhookIds.delete(id);
  }
  return false;
}

export const getWebhookConfigs = asyncHandler(
  async (req: Request, res: Response) => {
    const user = (req.session as any)?.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    if (user.role === 'superadmin') {
      const configs = await storage.getWebhookConfigs();
      return res.json(configs);
    }

    const ownerId = user.role === 'team' ? user.createdBy : user.id;
    const channels = await storage.getChannelsByUserId(ownerId);
    const channelIds = channels.map((ch: any) => ch.id);
    
    const allConfigs = await storage.getWebhookConfigs();
    const filteredConfigs = allConfigs.filter(
      (config: any) => config.channelId && channelIds.includes(config.channelId)
    );
    res.json(filteredConfigs);
  }
);

export const getWebhookConfigsByChannelId = asyncHandler(
  async (req: Request, res: Response) => {
    const channelId = req.params.id;
    const user = (req.session as any)?.user;
    
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    
    if (user.role !== 'superadmin') {
      const ownerId = user.role === 'team' ? user.createdBy : user.id;
      const channels = await storage.getChannelsByUserId(ownerId);
      const channelIds = channels.map((ch: any) => ch.id);
      if (!channelIds.includes(channelId)) {
        return res.status(403).json({ error: 'Access denied to this channel' });
      }
    }
    
    console.log("Fetching webhook configs for channel ID:", channelId);
    const configs = await db.select().from(webhookConfigs).where(eq(webhookConfigs.channelId, channelId));
    res.json(configs);
  }
);

export const getGlobalWebhookUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const protocol = req.headers["x-forwarded-proto"] === "https" ? "https" : "https";
    const host = req.get("host");
    const webhookUrl = `${protocol}://${host}/webhook/global`;
    res.json({ webhookUrl });
  }
);



export const createWebhookConfig = asyncHandler(
  async (req: Request, res: Response) => {
    const user = (req.session as any)?.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Only superadmin can configure webhooks' });

    const { verifyToken, appSecret, events } = req.body;

    if (!verifyToken) {
      throw new AppError(400, "Verify token is required");
    }

    const protocol = req.headers["x-forwarded-proto"] === "https" ? "https" : "https";
    const host = req.get("host");
    const webhookUrl = `${protocol}://${host}/webhook/global`;

    const config = await storage.createWebhookConfig({
      webhookUrl,
      verifyToken,
      appSecret: appSecret || "",
      events: events || [
        "messages",
        "message_status",
        "message_template_status_update",
      ],
      isActive: true,
      channelId: null,
    });

    res.status(201).json(config);
  }
);

export const updateWebhookConfig = asyncHandler(
  async (req: Request, res: Response) => {
    const user = (req.session as any)?.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Only superadmin can configure webhooks' });

    const { id } = req.params;
    const updates = req.body;

    const config = await storage.updateWebhookConfig(id, updates);
    if (!config) {
      throw new AppError(404, "Webhook config not found");
    }

    res.json(config);
  }
);

export const deleteWebhookConfig = asyncHandler(
  async (req: Request, res: Response) => {
    const user = (req.session as any)?.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Only superadmin can configure webhooks' });

    const { id } = req.params;

    const deleted = await storage.deleteWebhookConfig(id);
    if (!deleted) {
      throw new AppError(404, "Webhook config not found");
    }

    res.json({ success: true, message: "Webhook config deleted" });
  }
);

export const testWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  // console.log("Testing webhook for config ID:", id);
  const config = await storage.getWebhookConfig(id);
  if (!config) {
    throw new AppError(404, "Webhook config not found");
  }
  // console.log("Webhook config:", config);
  // Send a test webhook event
  const testPayload = {
    entry: [
      {
        id: "test-entry",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550555555",
                phone_number_id: "test-phone-id",
              },
              test: true,
            },
            field: "messages",
          },
        ],
      },
    ],
  };
  // console.log("Sending test webhook to:", config.webhookUrl , testPayload);
  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    // console.log('Test :::==========>' , response);
    if (!response.ok) {
      throw new AppError(
        500,
        `Test webhook failed with status ${response.status}`
      );
    }
    res.json({ success: true, message: "Test webhook sent successfully" });
  } catch (error) {
    throw new AppError(
      500,
      `Failed to send test webhook: ${(error as Error).message}`
    );
  }
});

export const handleWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      "hub.mode": mode,
      "hub.challenge": challenge,
      "hub.verify_token": verifyToken,
    } = req.query;

    const allConfigs = await storage.getWebhookConfigs();
    const activeConfig = allConfigs.find((c) => c.isActive);

    const envVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode && challenge) {
      // 1. Check database configs
      if (
        mode === "subscribe" &&
        activeConfig &&
        verifyToken === activeConfig.verifyToken
      ) {
        console.log("Webhook verified successfully (via DB config)");
        await storage.updateWebhookConfig(activeConfig.id, {
          lastPingAt: new Date(),
        });
        return res.send(challenge);
      }

      // 2. Fallback to .env token (useful for initial setup)
      if (
        mode === "subscribe" &&
        envVerifyToken &&
        verifyToken === envVerifyToken
      ) {
        console.log("Webhook verified successfully (via .env fallback)");
        return res.send(challenge);
      }

      console.error("Webhook verification failed. Provided:", verifyToken, "Expected (Env):", envVerifyToken, "Active Config ID:", activeConfig?.id);
      throw new AppError(403, "Verification failed");
    }

    const body = req.body;
    console.log("Webhook received:", JSON.stringify(body, null, 2));

    if (activeConfig) {
      await storage.updateWebhookConfig(activeConfig.id, {
        lastPingAt: new Date(),
      });
    }

    if (body.entry) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === "messages") {
            await handleMessageChange(change.value);
          } else if (change.field === "message_template_status_update") {
            await handleTemplateStatusUpdate(change.value, entry.id);
          } else if (change.field === "smb_message_echoes") {
            await handleSmbMessageEchoes(change.value);
          } else if (change.field === "smb_app_state_sync") {
            await handleSmbAppStateSync(change.value);
          }
        }
      }
    }

    res.sendStatus(200);
  }
);


async function processIncomingMedia(
  mediaId: string,
  mimeType: string,
  waApi: WhatsAppApiService
): Promise<string | null> {
  try {
    console.log(`📥 Downloading incoming media: ${mediaId}`);
    const buffer = await waApi.getMedia(mediaId);
    if (!buffer) {
      console.error(`❌ Failed to download incoming media buffer for ID: ${mediaId}`);
      return null;
    }

    const extension = mimeType.split("/")[1]?.split(";")[0] || "bin";
    const filename = `${Date.now()}-${mediaId}.${extension}`;

    // Try cloud storage first
    const doClient = await createDOClient();
    if (doClient) {
      const { s3, bucket, endpoint } = doClient;
      const fileKey = `uploads/incoming/${filename}`;
      console.log(`☁️ Uploading incoming media to cloud storage: ${fileKey}`);

      // Upload to DO Spaces (with ACL fallback retry)
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket!,
            Key: fileKey,
            Body: buffer,
            ACL: "public-read",
            ContentType: mimeType,
          })
        );
      } catch (s3Error: any) {
        if (s3Error.name === "AccessControlListNotSupported" || s3Error.message?.includes("ACL")) {
          console.warn("⚠️ S3 bucket does not support ACLs. Retrying without public-read ACL...");
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket!,
              Key: fileKey,
              Body: buffer,
              ContentType: mimeType,
            })
          );
        } else {
          throw s3Error;
        }
      }

      const endpointUrl = new URL(endpoint || "");
      const cloudUrl = `https://${bucket}.${endpointUrl.host}/${fileKey}`;
      console.log(`✅ Incoming media cloud upload successful: ${cloudUrl}`);
      return cloudUrl;
    }

    // Fallback to local storage
    const uploadDir = path.join("uploads", "incoming");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localPath = path.join(uploadDir, filename);
    fs.writeFileSync(localPath, buffer);
    console.log(`💾 Saved incoming media locally: ${localPath}`);
    return `/uploads/incoming/${filename}`;
  } catch (err) {
    console.error("❌ Error processing incoming media:", err);
    return null;
  }
}

async function handleMessageChange(value: any) {
  const { messages, contacts, metadata, statuses } = value;

  // Handle message status updates (sent, delivered, read, failed)
  if (statuses && statuses.length > 0) {
    await handleMessageStatuses(statuses, metadata);
    return;
  }

  if (!messages || messages.length === 0) {
    return;
  }

  // Find channel by phone number ID
  const phoneNumberId = metadata?.phone_number_id;
  if (!phoneNumberId) {
    console.error("No phone_number_id in webhook");
    return;
  }

  const channel = await storage.getChannelByPhoneNumberId(phoneNumberId);
  if (!channel) {
    console.error(`No channel found for phone_number_id: ${phoneNumberId}`);
    return;
  }

  if (channel.disableIncomingInbox) {
    console.log(`[Webhook] Incoming messages disabled for channel ${channel.id}. Ignoring messages.`);
    return;
  }

  const waApi = new WhatsAppApiService(channel);

  for (const message of messages) {
    const { from, id: whatsappMessageId, text, type, timestamp, interactive } = message;

    // Deduplication: skip if this exact wamid was already processed within 60s
    if (whatsappMessageId && _isAlreadyProcessed(whatsappMessageId)) {
      console.log(`[Webhook Dedup] Skipping duplicate inbound message: ${whatsappMessageId}`);
      continue;
    }

    if (whatsappMessageId) {
      const existingDbMsg = await storage.getMessageByWhatsAppId(whatsappMessageId);
      if (existingDbMsg) {
        console.log(`[Webhook DB Dedup] Skipping already stored inbound message: ${whatsappMessageId}`);
        continue;
      }
    }

    // Handle reaction messages before any other processing
    if (type === 'reaction' && message.reaction) {
      const emoji = message.reaction.emoji || '';
      const reactedMessageId = message.reaction.message_id;

      if (reactedMessageId) {
        const reactedMessage = await storage.getMessageByWhatsAppId(reactedMessageId);
        if (reactedMessage) {
          const existingMeta = (reactedMessage.metadata as any) || {};
          let reactions = existingMeta.reactions || [];

          if (!emoji) {
            reactions = reactions.filter((r: any) => r.from !== from);
            console.log(`Reaction removed from message ${reactedMessageId} by ${from}`);
          } else {
            reactions = reactions.filter((r: any) => r.from !== from);
            reactions.push({
              emoji,
              from,
              timestamp,
            });
            console.log(`Reaction ${emoji} added to message ${reactedMessageId} by ${from}`);
          }

          await storage.updateMessage(reactedMessage.id, {
            metadata: { ...existingMeta, reactions },
          });

          const io = (global as any).io;
          if (io) {
            io.to(`conversation:${reactedMessage.conversationId}`).emit('message_reaction', {
              conversationId: reactedMessage.conversationId,
              messageId: reactedMessage.id,
              reactions: [...reactions],
            });
          }
        }
      }
      continue;
    }

    // Handle edit messages — update the original message content, no new row
    if (type === 'edit' && message.edit) {
      const originalWaId = message.edit.original_message_id;
      const newText = message.edit.message?.text?.body || message.edit.message?.caption || '';

      if (originalWaId && newText) {
        const originalMessage = await storage.getMessageByWhatsAppId(originalWaId);
        if (originalMessage) {
          const existingMeta = (originalMessage.metadata as any) || {};
          await storage.updateMessage(originalMessage.id, {
            content: newText,
            metadata: {
              ...existingMeta,
              edited: true,
              editedAt: message.timestamp
                ? new Date(parseInt(message.timestamp) * 1000).toISOString()
                : new Date().toISOString(),
            },
          });

          const io = (global as any).io;
          if (io) {
            io.to(`conversation:${originalMessage.conversationId}`).emit('message_edited', {
              conversationId: originalMessage.conversationId,
              messageId: originalMessage.id,
              content: newText,
              editedAt: message.timestamp
                ? new Date(parseInt(message.timestamp) * 1000).toISOString()
                : new Date().toISOString(),
            });
          }
          console.log(`[Webhook] Edit applied to message ${originalWaId}: "${newText}"`);
        } else {
          console.log(`[Webhook] Edit received but original message not found: ${originalWaId}`);
        }
      }
      continue;
    }

    let messageContent = "";
    let interactiveData: any = null;

    // Check for Meta Ads click-to-chat referral payload
    if (message.referral) {
      interactiveData = { type: "referral", referral: message.referral };
    }

    let mediaId: string | null = null;
    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;
    let mediaSha256: string | null = null;
    let isVoice = false;

    if (type === "text" && text) {
      messageContent = text.body;

    } else if (type === "button" && message.button) {
      messageContent = message.button.text || "[Button reply]";
      interactiveData = { type: "button", buttonPayload: message.button.payload };

    } else if (type === "interactive" && interactive) {
      if (interactive.type === "button_reply") {
        messageContent = interactive.button_reply.title;
        interactiveData = interactive;
      } else if (interactive.type === "list_reply") {
        messageContent = interactive.list_reply.title;
        interactiveData = interactive;
      } else if (interactive.type === "nfm_reply") {
        messageContent = "[Flow reply]";
        interactiveData = { type: "nfm_reply", flowResponse: interactive.nfm_reply?.response_json };
      } else {
        messageContent = `[Interactive: ${interactive.type || "unknown"}]`;
        interactiveData = interactive;
      }

    } else if (type === "image" && message.image) {
      messageContent = message.image.caption || "[Image]";
      mediaId = message.image.id;
      mediaMimeType = message.image.mime_type;
      mediaSha256 = message.image.sha256;

    } else if (type === "document" && message.document) {
      messageContent =
        message.document.caption ||
        `[Document: ${message.document.filename || "file"}]`;
      mediaId = message.document.id;
      mediaMimeType = message.document.mime_type;
      mediaSha256 = message.document.sha256;

    } else if (type === "audio" && message.audio) {
      messageContent = "[Audio message]";
      mediaId = message.audio.id;
      mediaMimeType = message.audio.mime_type;
      mediaSha256 = message.audio.sha256;
      if (message.audio.voice === true || (message.audio as any).voice === "true") {
        isVoice = true;
      }

    } else if (type === "video" && message.video) {
      messageContent = message.video.caption || "[Video]";
      mediaId = message.video.id;
      mediaMimeType = message.video.mime_type;
      mediaSha256 = message.video.sha256;

    } else if (type === "sticker" && message.sticker) {
      messageContent = "[Sticker]";
      mediaId = message.sticker.id;
      mediaMimeType = message.sticker.mime_type;
      mediaSha256 = message.sticker.sha256;

    } else if (type === "location" && message.location) {
      messageContent = message.location.name || message.location.address || "[Location]";
      interactiveData = {
        type: "location",
        latitude: message.location.latitude,
        longitude: message.location.longitude,
        name: message.location.name,
        address: message.location.address,
        url: message.location.url,
      };

    } else if (type === "location_request") {
      messageContent = "[Location request]";

    } else if (type === "contacts" && message.contacts) {
      const sharedNames = message.contacts.map((c: any) => c.name?.formatted_name || "Unknown").join(", ");
      messageContent = `[Contact: ${sharedNames}]`;
      interactiveData = { type: "contacts", sharedContacts: message.contacts };

    } else if (type === "address" && message.address) {
      messageContent = "[Address message]";
      interactiveData = { type: "address", address: message.address };

    } else if (type === "template") {
      messageContent = "[Template message]";

    } else if (type === "order" && message.order) {
      messageContent = "[Order received]";
      interactiveData = { type: "order", order: message.order };

    } else if (type === "system") {
      messageContent = message.system?.body || "[System message]";
      interactiveData = { type: "system", systemType: message.system?.type };

    } else if (type === "referral") {
      messageContent = message.text?.body || "[Referral message]";
      interactiveData = { type: "referral", referral: message.referral };

    } else if (type === "unsupported") {
      const err = message.errors?.[0];
      const errTitle = err?.title || "This message type is not supported";
      messageContent = `[Unsupported: ${errTitle}]`;
      interactiveData = {
        type: "unsupported",
        originalType: type,
        errorCode: err?.code || null,
        errorTitle: err?.title || null,
        errorDetails: err?.error_data?.details || null,
        messageKeys: Object.keys(message),
        rawWebhook: message,
      };
      console.log(`[Webhook] Unsupported message from ${from}: errorCode=${err?.code}, errorTitle=${err?.title}, payload=${JSON.stringify(message)}`);

    } else {
      messageContent = `[Unsupported: Message type "${type}" unknown]`;
      interactiveData = {
        type: "unsupported",
        originalType: type,
        messageKeys: Object.keys(message),
        rawWebhook: message,
      };
      console.log(`[Webhook] Unknown message type "${type}" from ${from}, payload=${JSON.stringify(message)}`);
    }

    // Fetch media URL
    if (mediaId) {
      try {
        const processedUrl = await processIncomingMedia(mediaId, mediaMimeType || "image/jpeg", waApi);
        mediaUrl = processedUrl || (await waApi.fetchMediaUrl(mediaId));
      } catch (err) {
        console.error("❌ Failed to fetch media URL:", err);
      }
    }

    // Find/create contact (channel-scoped)
    const whatsappProfileName = contacts?.find((c: any) => c.wa_id === from)?.profile?.name || from;
    let contact = await storage.getContactByPhoneAndChannel(from, channel.id);
    let isNewConversation = false;

    if (!contact) {
      contact = await storage.createContact({
        name: whatsappProfileName,
        phone: from,
        channelId: channel.id,
        source: 'whatsapp',
        createdBy: channel.createdBy || undefined,
      });
    } else if (contact.name === contact.phone && whatsappProfileName !== from) {
      await storage.updateContact(contact.id, { name: whatsappProfileName });
      contact = { ...contact, name: whatsappProfileName };
    }

    // Find/create conversation (channel-scoped)
    let conversation = await storage.getConversationByPhoneAndChannel(from, channel.id);

    if (!conversation) {
      isNewConversation = true;

      conversation = await storage.createConversation({
        contactId: contact.id,
        contactPhone: from,
        contactName: contact.name || from,
        channelId: channel.id,
        unreadCount: 1,
        lastIncomingMessageAt: new Date(),
        lastMessageText: messageContent,
        lastMessageAt: new Date(),
      });

    } else {
      const updates: any = {
        unreadCount: (conversation.unreadCount || 0) + 1,
        lastMessageAt: new Date(),
        lastIncomingMessageAt: new Date(),
        lastMessageText: messageContent,
      };
      if (conversation.contactName !== contact.name) {
        updates.contactName = contact.name;
      }
      if (!conversation.contactId && contact.id) {
        updates.contactId = contact.id;
      }
      await storage.updateConversation(conversation.id, updates);
    }

    const storedMessageType = interactiveData?.type === "unsupported" ? "unsupported" : type;

    // Parse context (Reply)
    let finalMetadata: any = interactiveData ? { ...interactiveData } : {};
    if (isVoice) {
      finalMetadata.voice = true;
    }
    if (message.context && message.context.id) {
      try {
        const originalMsg = await storage.getMessageByWhatsAppId(message.context.id);
        if (originalMsg) {
          finalMetadata.replyTo = {
            id: originalMsg.id,
            whatsappMessageId: originalMsg.whatsappMessageId,
            content: originalMsg.content,
            fromUser: originalMsg.fromUser,
            messageType: originalMsg.messageType
          };
        }
      } catch (err) {
        console.error("Failed to fetch context message:", err);
      }
    }

    // Create DB message
    const newMessage = await storage.createMessage({
      conversationId: conversation.id,
      content: messageContent,
      fromUser: false,
      direction: "inbound",
      status: "received",
      whatsappMessageId,
      messageType: storedMessageType,
      metadata: Object.keys(finalMetadata).length > 0 ? JSON.stringify(finalMetadata) : null,
      timestamp: new Date(parseInt(timestamp, 10) * 1000),

      mediaId,
      mediaUrl,
      mediaMimeType,
      mediaSha256,
    });

// ================================
//  🔥 REALTIME SEND USING IO
// ================================
const io = (global as any).io;


if (io) {
  const channelRoom = `channel:${channel.id}`;
  const conversationRoom = `conversation:${conversation.id}`;

  const normalizedPayload = {
    type: "new-message",
    conversationId: conversation.id,
    content: messageContent, 
    createdAt: new Date().toISOString(),
    messageType: type,
    from: "whatsapp",
  };

  // ✅ 1. Sidebar / Inbox realtime
  console.log(`📡 [Socket Emit] Emitting to channelRoom (${channelRoom}):`, normalizedPayload);
  io.to(channelRoom).emit("new-message", normalizedPayload);

  // ✅ 2. Open conversation realtime
  console.log(`📡 [Socket Emit] Emitting to conversationRoom (${conversationRoom}):`, normalizedPayload);
  io.to(conversationRoom).emit("new-message", normalizedPayload);

  // ✅ New conversation notification
  if (isNewConversation) {
    io.to(channelRoom).emit("conversation_created", {
      conversation: {
        ...conversation,
        lastMessageText: messageContent,
        lastMessageAt: new Date().toISOString(),
      },
      message: {
        id: newMessage.id,
        conversationId: conversation.id,
        content: messageContent,
        messageType: type,
        createdAt: new Date().toISOString(),
      },
    });
  }

  console.log("✅ Emitted to channel + conversation rooms");
} else {
  console.error("❌ IO not initialized");
}

    try {
      const isGroupMessage = contact?.isGroup === true || from.endsWith("@g.us");
      if (channel.createdBy && !isGroupMessage) {
        const ownerId = channel.createdBy;
        const ownerResult = await db.select().from(users).where(eq(users.id, ownerId));
        const teamMembers = await db.select().from(users).where(eq(users.createdBy, ownerId));
        const allUsers = [...ownerResult, ...teamMembers];
        const targetUserIds = [...new Set(allUsers.map((u) => u.id))];

        if (targetUserIds.length > 0) {
          const contactName = contact.name || from;
          const preview = messageContent.length > 100 ? messageContent.substring(0, 100) + "..." : messageContent;

          console.log(`🔔 Triggering new_message notification for ${targetUserIds.length} user(s)`);
          await triggerThrottledNotification({
            contactName,
            contactPhone: from,
            channelName: channel.name || channel.phoneNumber || "Unknown",
            messagePreview: preview,
            conversationId: conversation.id,
          }, targetUserIds, channel.id);
          console.log(`✅ new_message notification sent`);
        }
      }
    } catch (notifError) {
      console.error("❌ Error sending new message notification:", notifError);
    }

    // Automations (run first — takes priority over AI)
    let automationHandled = false;
    try {
      const hasPendingExecution =
        await triggerService.getExecutionService().hasPendingExecutionAsync(conversation.id);

      if (hasPendingExecution) {
        const result =
          await triggerService.getExecutionService().handleUserResponse(
            conversation.id,
            messageContent,
            interactiveData
          );

        if (result && result.success) {
          if (io) {
            io.to(`conversation_${conversation.id}`).emit("automation-resumed", {
              type: "automation-resumed",
              data: result,
            });
          }
          automationHandled = true;
        }
      }

      if (!automationHandled) {
        if (isNewConversation) {
          automationHandled = await triggerService.handleNewConversation(
            conversation.id,
            channel.id,
            contact?.id
          );
        }
        
        // If it was a new conversation but no "new_conversation" flow was triggered,
        // or if it's an existing conversation, try triggering "message_received" flows!
        if (!automationHandled) {
          automationHandled = await triggerService.handleMessageReceived(
            conversation.id,
            {
              content: messageContent,
              text: messageContent,
              body: messageContent,
              type,
              from,
              whatsappMessageId,
              timestamp,
              interactive: interactiveData,
            },
            channel.id,
            contact?.id
          );
        }
      }

    } catch (automationError) {
      console.error("Automation Error:", automationError);

      if (io) {
        io.to(`conversation_${conversation.id}`).emit("automation-error", {
          type: "automation-error",
          error: automationError,
        });
      }
    }

    // AI auto reply — only fires when no automation handled this message, text only
    if (!automationHandled && type === "text" && messageContent) {
      try {
        const { AiAssistantProfileService } = await import("../services/ai-assistant-profile.service");
        let handled = false;
        try {
          handled = await AiAssistantProfileService.processIncomingMessage(
            channel.id,
            contact.id,
            conversation.id,
            messageContent
          );
        } catch (aiProfileErr) {
          console.error("❌ [Webhook] Error running AI Assistant Profile:", aiProfileErr);
        }

        if (handled) {
          console.log(`🤖 [Webhook] AI Assistant Profile handled reply/action for Cloud API conversation: ${conversation.id}`);
        } else {
          const shouldSendAiReply = await checkAndSendAiReply(
            messageContent,
            conversation,
            contact,
            waApi
          );

          if (shouldSendAiReply) {
            console.log(`AI auto reply complete for conversation ${conversation.id}`);
          }
        }
      } catch (err) {
        console.error("AI Error:", err);
      }
    }
  }
}

// --- AI AUTO-REPLY HELPER FUNCTION (NEW) ---
async function checkAndSendAiReply(
  messageContent: string,
  conversation: any,
  contact: any,
  whatsappApi: any
): Promise<boolean> {
  if (conversation.status === "assigned" && conversation.assignedTo) {
    return false;
  }

  const getAiSettings = await db
    .select()
    .from(aiSettings)
    .where(eq(aiSettings.channelId, conversation.channelId))
    .limit(1)
    .then((res) => res[0]);

  if (!getAiSettings || !getAiSettings.isActive) {
    return false;
  }

  // Fetch site matching this channel to load prompt/training data configurations
  const channelSites = await db
    .select()
    .from(sites)
    .where(eq(sites.channelId, conversation.channelId))
    .limit(1);

  let site = channelSites[0];
  if (!site) {
    const [newSite] = await db
      .insert(sites)
      .values({
        name: conversation.channelName || "Default Site",
        domain: "localhost",
        channelId: conversation.channelId,
        widgetEnabled: true,
        widgetConfig: {
          systemPrompt: `You are a helpful customer support AI assistant for our company. Answer questions using the provided knowledge base.`,
          escalationRules: {
            enabled: true,
            maxAttempts: 3,
            escalationMessage: "I'm transferring you to a human agent who can better assist you.",
          }
        },
        aiTrainingConfig: {
          model: "gpt-4o-mini",
          temperature: "0.7",
          maxTokens: "500",
        }
      })
      .returning();
    site = newSite;
    console.log(`[AI Cloud API] Auto-created site ${site.id} for channel ${conversation.channelId} during AI reply processing`);
  }

  let triggerWords: string[] = [];
  if (Array.isArray(getAiSettings.words)) {
    triggerWords = getAiSettings.words;
  } else if (typeof getAiSettings.words === "string") {
    try {
      triggerWords = JSON.parse(getAiSettings.words);
    } catch {
      triggerWords = [];
    }
  }

  const messageLower = messageContent.toLowerCase().trim();

  // Load message history to evaluate conversational trigger activation and context
  const conversationHistory = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(desc(messages.timestamp));

  const hasBotReplied = conversationHistory.some(
    (m: any) => m.direction === "outbound" && m.fromType === "bot"
  );

  if (triggerWords.length > 0) {
    const hasMatch = triggerWords.some((word: string) =>
      messageLower.includes(word.toLowerCase().trim())
    );

    if (!hasMatch) {
      console.log(`[AI Cloud API] Skipping auto-reply for channel ${conversation.channelId} - trigger word not matched`);
      return false;
    }
    
    console.log(`[AI Cloud API] Trigger word matched: "${messageContent}"`);
  } else {
    console.log(`[AI Cloud API] No trigger words configured — replying to all messages`);
  }

  // Generate AI response with full site widget/training data context
  let aiResponse = await generateAiResponse(
    messageContent,
    conversationHistory,
    contact,
    getAiSettings,
    site
  );

  if (!aiResponse) {
    console.error("❌ Failed to generate AI response");
    return false;
  }

  // Check if AI requested escalation to human agent
  let escalated = false;
  if (aiResponse.includes("[ESCALATE_TO_AGENT]")) {
    aiResponse = aiResponse.replace(/\[ESCALATE_TO_AGENT\]/g, "").trim();
    escalated = true;
  }

  if (!aiResponse.trim()) {
    console.log("[AI Cloud API] Generated empty response after stripping escalation tags, skipping");
    return false;
  }

  // Send AI reply via WhatsApp
  try {
    const result = await whatsappApi.sendTextMessage(
      conversation.contactPhone,
      aiResponse
    );

    // Save AI response as outbound message with correct bot labels
    const aiMessage = await storage.createMessage({
      conversationId: conversation.id,
      content: aiResponse,
      fromUser: false,
      fromType: "bot",
      direction: "outbound",
      status: "sent",
      whatsappMessageId: result.messages?.[0]?.id || null,
      messageType: "text",
      metadata: JSON.stringify({ aiGenerated: true, trigger: messageContent }),
      timestamp: new Date(),
    });

    // Update conversation
    await storage.updateConversation(conversation.id, {
      lastMessageAt: new Date(),
      lastMessageText: aiResponse,
    });

    // Handle escalation side effects
    if (escalated) {
      await db
        .update(conversations)
        .set({
          status: "assigned",
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));

      console.log(`[AI Cloud API] Escalated conversation ${conversation.id} to human agents`);

      if ((global as any).io) {
        (global as any).io.emit("conversation-updated", {
          conversationId: conversation.id,
          status: "assigned",
        });
      }
    }

    // Broadcast AI message via WebSocket
    if ((global as any).broadcastToConversation) {
      (global as any).broadcastToConversation(conversation.id, {
        type: "new-message",
        message: aiMessage,
      });

      (global as any).broadcastToConversation(conversation.id, {
        type: "ai-reply-sent",
        data: {
          messageId: aiMessage.id,
          trigger: messageContent,
          response: aiResponse,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to send AI reply via Cloud API:", error);
    throw error;
  }
}

// --- AI RESPONSE GENERATION (NEW) ---
async function generateAiResponse(
  userMessage: string,
  conversationHistory: any[],
  contact: any,
  aiSettings: any,
  site: any
): Promise<string | null> {
  try {
    const { provider, apiKey, model, endpoint, temperature, maxTokens } = aiSettings;
    const siteId = site?.id || "";
    const channelId = site?.channelId || "";

    // Retrieve relevant chunks and QA pairs from Knowledge Base training database
    let trainingContext = "";
    try {
      if (siteId) {
        const trainingResults = await searchTrainingData(siteId, channelId, userMessage);
        if (trainingResults.chunks.length > 0) {
          trainingContext += "\n\n--- RELEVANT KNOWLEDGE BASE & TRAINING DATA ---\n";
          trainingContext += trainingResults.chunks.join("\n\n");
        }
        if (trainingResults.qaPairs.length > 0) {
          trainingContext += "\n\n--- RELEVANT FAQ PAIRS ---\n";
          for (const qa of trainingResults.qaPairs) {
            trainingContext += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
          }
        }
      }
    } catch (err) {
      console.warn("[AI webhooks] Training data search failed:", err);
    }

    const widgetCfg = site?.widgetConfig || {};
    const escalationConfig = widgetCfg.escalationRules || {};
    const maxAttempts = escalationConfig.maxAttempts || 3;

    // Count unanswered questions to trigger auto-escalation
    const unansweredCount = conversationHistory.filter((m: any) =>
      m.direction === "outbound" && m.fromType === "bot" &&
      (m.content.includes("I don't have") || m.content.includes("I'm not sure") || m.content.includes("I cannot find"))
    ).length;

    const siteName = site?.name || "our company";
    const basePrompt = widgetCfg.systemPrompt ||
      `You are a helpful, friendly customer support assistant for ${siteName}. Answer questions using the provided facts in the knowledge base. Be conversational and helpful. Keep responses concise for WhatsApp (under 300 words). If you don't know the answer, be honest about it.`;

    const escalationInstruction = `\n\nCRITICAL INSTRUCTIONS:
- You are strictly restricted to only answering questions using the facts provided in the "RELEVANT KNOWLEDGE BASE & TRAINING DATA" or "RELEVANT FAQ PAIRS" sections above.
- If the answer to the user's message is not explicitly found in the provided knowledge base, or if the user asks a general question, or if the message is a greeting/typo/meaningless character, you MUST start your response with exactly: "[ESCALATE_TO_AGENT]" and then explain politely that you are transferring them to a human assistant.
- Do NOT use your general pre-trained knowledge to answer questions that are not covered in the knowledge base.
- When escalating, you MUST include the text "[ESCALATE_TO_AGENT]" at the very beginning of your response.
${unansweredCount >= maxAttempts - 1 ? `- The user has had ${unansweredCount} unanswered questions. If you cannot answer this one confidently, you MUST escalate with "[ESCALATE_TO_AGENT]".` : ""}`;

    const systemPrompt = basePrompt + trainingContext + escalationInstruction;

    // Build context payload
    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Add conversation history in chronological order (max 10)
    // We start slice at 1 to skip the current incoming message which was already inserted into the database!
    conversationHistory
      .slice(1, 11)
      .reverse()
      .forEach((msg) => {
        messages.push({
          role: msg.direction === "inbound" ? "user" : "assistant",
          content: msg.content,
        });
      });

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    let aiResponse: string | null = null;
    const finalModel = model || "gpt-4o-mini";
    const finalTemp = parseFloat(temperature || "0.7");
    const finalMaxTokens = parseInt(maxTokens || "500", 10);

    if (provider === "openai") {
      aiResponse = await callOpenAI(
        messages,
        apiKey,
        finalModel,
        endpoint || "https://api.openai.com/v1",
        finalTemp,
        finalMaxTokens
      );
    } else if (provider === "anthropic") {
      aiResponse = await callAnthropic(
        messages,
        apiKey,
        finalModel,
        endpoint || "https://api.anthropic.com/v1",
        finalTemp,
        finalMaxTokens
      );
    } else {
      console.error(`Unsupported AI provider: ${provider}`);
      return null;
    }

    return aiResponse;
  } catch (error) {
    console.error("❌ Error generating AI response:", error);
    return null;
  }
}

// --- OpenAI API Call ---
async function callOpenAI(
  messages: any[],
  apiKey: string,
  model: string,
  endpoint: string,
  temperature: number,
  maxTokens: number
): Promise<string | null> {
  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    return null;
  }
}

// --- Anthropic API Call ---
async function callAnthropic(
  messages: any[],
  apiKey: string,
  model: string,
  endpoint: string,
  temperature: number,
  maxTokens: number
): Promise<string | null> {
  try {
    // Extract system message and convert format
    const systemMessage = messages.find((m) => m.role === "system")?.content || "";
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

    const response = await fetch(`${endpoint}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        system: systemMessage,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      return null;
    }

    const data = await response.json();
    return data.content?.[0]?.text || null;
  } catch (error) {
    console.error("Anthropic API call failed:", error);
    return null;
  }
}



async function handleMessageStatuses(statuses: any[], metadata: any) {
  const phoneNumberId = metadata?.phone_number_id;
  if (!phoneNumberId) {
    console.error("No phone_number_id in webhook status update");
    return;
  }

  const channel = await storage.getChannelByPhoneNumberId(phoneNumberId);
  if (!channel) {
    console.error(`No channel found for phone_number_id: ${phoneNumberId}`);
    return;
  }

  for (const statusUpdate of statuses) {
    const {
      id: whatsappMessageId,
      status,
      timestamp,
      errors,
      recipient_id,
    } = statusUpdate;

    // Deduplication: skip if this wamid+status combo was already processed within 60s
    const dedupKey = `${whatsappMessageId}:${status}`;
    if (whatsappMessageId && _isAlreadyProcessed(dedupKey)) {
      console.log(`[Webhook Dedup] Skipping duplicate status update: ${whatsappMessageId} - ${status}`);
      continue;
    }

    console.log(
      `📊 Message status update: ${whatsappMessageId} - ${status}`,
      errors ? `Errors: ${errors.length}` : ""
    );

    // Find matching queue entry from message_queue (campaign messages)
    const [queueEntry] = await db.select()
      .from(messageQueue)
      .where(eq(messageQueue.whatsappMessageId, whatsappMessageId))
      .limit(1);

    if (queueEntry) {
      // Monotonic milestone tracking: use persisted timestamps/flags as source
      // of truth, not status string — statuses can arrive out of order.
      const alreadyDelivered = !!queueEntry.deliveredAt;
      const alreadyRead = !!queueEntry.readAt;
      const alreadyFailed = queueEntry.status === "failed";

      let queueErrorCode: string | null = null;
      let queueErrorMessage: string | null = null;
      const now = new Date(parseInt(timestamp, 10) * 1000);
      const updateFields: Record<string, any> = {};

      let shouldIncrementDelivered = false;
      let shouldIncrementRead = false;
      let shouldIncrementFailed = false;
      let shouldDecrementSent = false;

      if (status === "delivered" && !alreadyDelivered && !alreadyRead) {
        // First time reaching delivered milestone (and not already advanced to read)
        updateFields.status = "delivered";
        updateFields.deliveredAt = now;
        shouldIncrementDelivered = true;
      } else if (status === "read" && !alreadyRead) {
        // First time reaching read milestone
        updateFields.status = "read";
        updateFields.readAt = now;
        shouldIncrementRead = true;
        if (!alreadyDelivered) {
          // Read implies delivery — backfill the delivery milestone too
          updateFields.deliveredAt = now;
          shouldIncrementDelivered = true;
        }
      } else if (status === "failed" && errors && errors.length > 0 && !alreadyDelivered && !alreadyRead && !alreadyFailed) {
        // Only mark failed if no positive milestone was already reached
        updateFields.status = "failed";
        const error = errors[0];
        queueErrorCode = String(error.code);
        queueErrorMessage = error.message || error.details || error.title || "Unknown failure";
        updateFields.errorCode = queueErrorCode;
        updateFields.errorMessage = queueErrorMessage;
        shouldIncrementFailed = true;
        shouldDecrementSent = queueEntry.status === "sent";
      }

      const campaignId = queueEntry.campaignId;

      if (Object.keys(updateFields).length > 0) {
        await db.update(messageQueue)
          .set(updateFields)
          .where(eq(messageQueue.id, queueEntry.id));

        if (campaignId) {
          await db.update(campaignRecipients)
            .set(updateFields)
            .where(and(
              eq(campaignRecipients.campaignId, campaignId),
              eq(campaignRecipients.phone, queueEntry.recipientPhone)
            ));
        }
      }

      // Increment campaign counters only for first attainment of each milestone
      if (campaignId && (shouldIncrementDelivered || shouldIncrementRead || shouldIncrementFailed)) {
        const counterUpdate: Record<string, any> = {};
        if (shouldIncrementDelivered) {
          counterUpdate.deliveredCount = sql`COALESCE(${campaigns.deliveredCount}, 0) + 1`;
        }
        if (shouldIncrementRead) {
          counterUpdate.readCount = sql`COALESCE(${campaigns.readCount}, 0) + 1`;
        }
        if (shouldIncrementFailed) {
          const isMetaEcosystemIssue = (codeStr: string | number | null | undefined) => {
            if (!codeStr) return false;
            const cleanStr = String(codeStr).trim();
            const codeNum = Number(cleanStr);
            if (isNaN(codeNum)) return false;
            return (
              codeNum === 368 ||
              codeNum === 100 ||
              codeNum === 190 ||
              codeNum === 200 ||
              (codeNum >= 130000 && codeNum <= 136000)
            );
          };
          if (isMetaEcosystemIssue(queueErrorCode || queueEntry.errorCode)) {
            counterUpdate.nonDeliverableCount = sql`COALESCE(${campaigns.nonDeliverableCount}, 0) + 1`;
          } else {
            counterUpdate.failedCount = sql`COALESCE(${campaigns.failedCount}, 0) + 1`;
          }
        }
        if (shouldDecrementSent) {
          counterUpdate.sentCount = sql`GREATEST(COALESCE(${campaigns.sentCount}, 0) - 1, 0)`;
        }
        await db.update(campaigns).set(counterUpdate).where(eq(campaigns.id, campaignId));
        console.log(
          `📊 [Campaign ${campaignId}] Counters updated for ${whatsappMessageId}:`,
          Object.keys(counterUpdate).join(", ")
        );
      }
    }

    // Find the message by WhatsApp ID in inbox messages table
    const message = await storage.getMessageByWhatsAppId(whatsappMessageId);

    // If not found in messages table AND not found in message_queue, log and skip
    if (!message && !queueEntry) {
      console.log(`⚠️ Message not found for WhatsApp ID: ${whatsappMessageId}`);
      continue;
    }

    // If message exists in messages table but not found, skip updating message status (but queueEntry was updated)
    if (!message) {
      continue;
    }

    // Map WhatsApp status to our status
    let messageStatus: "sent" | "delivered" | "read" | "failed" = "sent";
    let errorDetails = null;

    if (status === "sent") {
      messageStatus = "sent";
    } else if (status === "delivered") {
      messageStatus = "delivered";
    } else if (status === "read") {
      messageStatus = "read";
    } else if (status === "failed" && errors && errors.length > 0) {
      messageStatus = "failed";
      const error = errors[0];
      const enriched = getWhatsAppError(error.code);
      errorDetails = {
        code: error.code,
        title: error.title,
        message: error.message || error.details,
        description: enriched.description,
        suggestion: enriched.suggestion,
        errorData: error.error_data,
        recipientId: recipient_id,
        timestamp: timestamp,
      };

      console.error(`❌ Message failed with error:`, errorDetails);
    }

    const pricingData = statusUpdate.pricing;
    const conversationData = statusUpdate.conversation;
    const existingMetadata = (message.metadata as Record<string, any>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      ...(pricingData ? { pricing: pricingData } : {}),
      ...(conversationData ? { conversation: conversationData } : {}),
    };

    const updatedMessage = await storage.updateMessage(message.id, {
      status: messageStatus,
      errorDetails: errorDetails || null,
      deliveredAt:
        messageStatus === "delivered"
          ? new Date(parseInt(timestamp, 10) * 1000)
          : message.deliveredAt,
      readAt:
        messageStatus === "read"
          ? new Date(parseInt(timestamp, 10) * 1000)
          : message.readAt,
      metadata: updatedMetadata,
      updatedAt: new Date(),
    });

    if (messageStatus === "read") {
      try {
        const executionService = triggerService.getExecutionService();
        await executionService.handleMessageRead(whatsappMessageId);
      } catch (err) {
        console.error(`[Webhook Status] Error triggering wait_read resumption for ${whatsappMessageId}:`, err);
      }
    }

    if (messageStatus === "delivered") {
      try {
        const executionService = triggerService.getExecutionService();
        await executionService.handleMessageDelivered(whatsappMessageId);
      } catch (err) {
        console.error(`[Webhook Status] Error triggering wait_read delivery check for ${whatsappMessageId}:`, err);
      }
    }

    // Broadcast status update
    // if ((global as any).broadcastToConversation && message.conversationId) {
    //   (global as any).broadcastToConversation(message.conversationId, {
    //     type: "message-status-update",
    //     data: {
    //       messageId: message.id,
    //       whatsappMessageId,
    //       status: messageStatus,
    //       errorDetails,
    //       timestamp: new Date(parseInt(timestamp, 10) * 1000),
    //     },
    //   });
    // }


    const io = (global as any).io;

if (io && message.conversationId) {
  const statusPayload = {
    conversationId: message.conversationId,
    messageId: message.id,
    whatsappMessageId,
    status: messageStatus,
    timestamp: new Date(parseInt(timestamp, 10) * 1000).toISOString(),
    errorDetails,
  };

  io.to(`conversation:${message.conversationId}`).emit(
    "message_status_update",
    statusPayload
  );

  if (channel?.id) {
    io.to(`channel:${channel.id}`).emit(
      "message_status_update",
      statusPayload
    );
  }

  console.log(
    "📤 message_status_update emitted to conversation + channel:",
    whatsappMessageId,
    messageStatus
  );
}


    // Campaign counters are updated in the messageQueue milestone block above to avoid double-counting.
  }
}

async function handleTemplateStatusUpdate(value: any, wabaId?: string) {
  const { message_template_id, message_template_name, event, reason } = value;

  console.log(
    `[Template Status] Update received: ${message_template_name} (WA ID: ${message_template_id}) - ${event}${
      reason ? ` - Reason: ${reason}` : ""
    } - WABA: ${wabaId || "unknown"}`
  );

  if (message_template_id && event) {
    const eventUpper = String(event).toUpperCase();
    let status = "PENDING";
    if (eventUpper === "APPROVED") {
      status = "APPROVED";
    } else if (eventUpper === "REJECTED") {
      status = "REJECTED";
    } else if (eventUpper === "PAUSED") {
      status = "PAUSED";
    } else if (eventUpper === "DISABLED") {
      status = "DISABLED";
    }

    let targetChannelId: string | null = null;

    if (wabaId) {
      const allChannels = await storage.getChannels();
      const matchedChannel = allChannels.find(
        (ch: any) => String(ch.whatsappBusinessAccountId) === String(wabaId)
      );
      if (matchedChannel) {
        targetChannelId = matchedChannel.id;
        console.log(`[Template Status] Matched WABA ${wabaId} to channel: ${matchedChannel.phoneNumber} (${targetChannelId})`);
      } else {
        console.warn(`[Template Status] No channel found for WABA ${wabaId}, falling back to global search`);
      }
    }

    let template: any = null;

    if (targetChannelId) {
      const { data: channelTemplates } = await storage.getTemplatesByChannel(targetChannelId, 1, 10000);
      const templatesList = Array.isArray(channelTemplates) ? channelTemplates : [];
      template = templatesList.find(
        (t: any) => String(t.whatsappTemplateId) === String(message_template_id)
      );
    }

    if (!template) {
      const templatesResult = await storage.getTemplates(1, 10000);
      const templatesList = Array.isArray(templatesResult) ? templatesResult : (templatesResult?.data || []);
      template = templatesList.find(
        (t: any) => String(t.whatsappTemplateId) === String(message_template_id)
      );
    }

    if (template) {
      const updateData: any = { status };
      if (eventUpper === "REJECTED" && reason) {
        updateData.rejectionReason = reason;
      }
      await storage.updateTemplate(template.id, updateData);
      console.log(
        `[Template Status] Updated template "${template.name}" (channel: ${template.channelId}) status to ${status}${
          reason ? ` with reason: ${reason}` : ""
        }`
      );
    } else {
      console.warn(`[Template Status] No matching template found for WA ID: ${message_template_id} in channel: ${targetChannelId || "any"}`);
    }
  }
}

// ============== ADDITIONAL HELPER FUNCTIONS ==============

/**
 * Get automation execution status for a conversation
 * Useful for debugging and monitoring
 */
export const getConversationAutomationStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;

    const executionService = triggerService.getExecutionService();
    const hasPending = executionService.hasPendingExecution(conversationId);
    const pendingExecutions = executionService
      .getPendingExecutions()
      .filter((pe) => pe.conversationId === conversationId);

    res.json({
      conversationId,
      hasPendingExecution: hasPending,
      pendingExecutions,
      totalPendingCount: pendingExecutions.length,
    });
  }
);

/**
 * Cancel automation execution for a conversation
 * Useful for manual intervention
 */
export const cancelConversationAutomation = asyncHandler(
  async (req: Request, res: Response) => {
    const { conversationId } = req.params;

    const executionService = triggerService.getExecutionService();
    const cancelled = await executionService.cancelExecution(conversationId);

    res.json({
      success: cancelled,
      conversationId,
      message: cancelled
        ? "Automation execution cancelled successfully"
        : "No pending execution found for this conversation",
    });
  }
);

/**
 * Get all pending executions across all conversations
 * Useful for monitoring dashboard
 */
export const getAllPendingExecutions = asyncHandler(
  async (req: Request, res: Response) => {
    const executionService = triggerService.getExecutionService();
    const pendingExecutions = executionService.getPendingExecutions();

    res.json({
      totalCount: pendingExecutions.length,
      executions: pendingExecutions,
    });
  }
);

/**
 * Cleanup expired executions manually
 * Can be called via API or scheduled job
 */
export const cleanupExpiredExecutions = asyncHandler(
  async (req: Request, res: Response) => {
    const { timeoutMinutes = 30 } = req.query;
    const timeoutMs = parseInt(timeoutMinutes as string) * 60 * 1000;

    const executionService = triggerService.getExecutionService();
    const cleanedCount = await executionService.cleanupExpiredExecutions(
      timeoutMs
    );

    res.json({
      success: true,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} expired executions`,
    });
  }
);





// Razorpay Webhook Handler
export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const provider = await db
      .select()
      .from(paymentProviders)
      .where(and(eq(paymentProviders.providerKey, "razorpay"), eq(paymentProviders.isActive, true)))
      .limit(1);

    const webhookSecret =
      provider[0]?.config?.webhookSecret ||
      process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const signature = req.headers['x-razorpay-signature'] as string;

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    let isSignatureValid = (signature === expectedSignature);
    const event = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    const eventType = event.event;

    if (!isSignatureValid) {
      console.log('⚠️ Razorpay webhook signature invalid, running tenant-specific callback validation fallback...');
      
      // Fallback for tenant-specific accounts
      if (eventType === 'payment_link.paid' && event.payload?.payment_link?.entity?.id) {
        const paymentLinkId = event.payload.payment_link.entity.id;
        const pausedExecutions = await db
          .select()
          .from(automationExecutions)
          .where(eq(automationExecutions.status, 'paused'));

        const matched = pausedExecutions.find((exec: any) => {
          const vars = exec.variables || {};
          return Object.values(vars).includes(paymentLinkId);
        });

        if (matched) {
          // Found matching paused execution! Now let's find the active node in the automation schema
          const automationData = await db.select().from(automations).where(eq(automations.id, matched.automationId)).limit(1);
          if (automationData.length > 0 && automationData[0].automation_nodes) {
            const nodes = automationData[0].automation_nodes as any[];
            // Find a razorpay_generate node that produced this URL variable
            const rzpNode = nodes.find(n => n.type === 'razorpay_generate');
            const keyId = rzpNode?.data?.razorpayKeyId;
            const keySecret = rzpNode?.data?.razorpayKeySecret;

            if (keyId && keySecret) {
              console.log(`🔍 Webhook Fallback: Double-verifying payment link ${paymentLinkId} directly via Tenant Razorpay API...`);
              const Razorpay = (await import('razorpay')).default;
              const tenantRzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
              try {
                const fetchedLink: any = await tenantRzp.paymentLink.fetch(paymentLinkId);
                if (fetchedLink && fetchedLink.status === 'paid') {
                  console.log(`✅ Webhook Fallback: Tenant Razorpay API confirmed payment link is PAID. Proceeding.`);
                  isSignatureValid = true; // Mark as valid to allow execution
                } else {
                  console.log(`❌ Webhook Fallback: Tenant Razorpay API returned status: ${fetchedLink?.status || 'unknown'}`);
                }
              } catch (fetchErr) {
                console.error(`❌ Webhook Fallback: Failed to fetch payment link status:`, fetchErr);
              }
            }
          }
        }
      }

      if (!isSignatureValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook signature'
        });
      }
    }

    console.log('Razorpay Webhook Event:', eventType);

    switch (eventType) {
      case 'payment.authorized':
        await handleRazorpayPaymentAuthorized(event);
        break;
      case 'payment.captured':
        await handleRazorpayPaymentCaptured(event);
        break;
      case 'payment_link.paid':
        await handleRazorpayPaymentLinkPaid(event);
        break;
      case 'payment.failed':
        await handleRazorpayPaymentFailed(event);
        break;
      case 'order.paid':
        await handleRazorpayOrderPaid(event);
        break;
      case 'refund.created':
        await handleRazorpayRefundCreated(event);
        break;
      case 'subscription.activated':
        await handleRazorpaySubscriptionActivated(event);
        break;
      case 'subscription.charged':
        await handleRazorpaySubscriptionCharged(event);
        break;
      case 'subscription.cancelled':
        await handleRazorpaySubscriptionCancelled(event);
        break;
      case 'subscription.halted':
        await handleRazorpaySubscriptionHalted(event);
        break;
      case 'subscription.completed':
        await handleRazorpaySubscriptionCompleted(event);
        break;
      default:
        console.log('Unhandled Razorpay event:', eventType);
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error });
  }
};

// Instamojo Webhook Handler
export const instamojoWebhook = async (req: Request, res: Response) => {
  try {
    const { payment_request_id, status, payment_id } = req.body;
    console.log(`💳 Instamojo Webhook: Received callback for payment request ${payment_request_id}, status: ${status}`);

    if (!payment_request_id) {
      return res.status(400).json({ success: false, message: 'Missing payment_request_id' });
    }

    // Find paused execution matching this reference ID
    const pausedExecutions = await db
      .select()
      .from(automationExecutions)
      .where(eq(automationExecutions.status, 'paused'));

    const matched = pausedExecutions.find((exec: any) => {
      const vars = exec.variables || {};
      return Object.values(vars).includes(payment_request_id);
    });

    if (!matched) {
      console.log(`⚠️ Instamojo Webhook: No matching paused execution found for payment request ${payment_request_id}`);
      return res.status(200).json({ success: true, message: 'No execution matched' });
    }

    console.log(`▶️ Instamojo Webhook: Found matching execution ${matched.id}. Triggering verification...`);

    // Fetch automation to find the node config
    const automation = await db.query.automations.findFirst({
      where: eq(automations.id, matched.automationId),
    });

    if (!automation || !automation.nodes) {
      return res.status(500).json({ success: false, message: 'Automation not found' });
    }

    const flowData = typeof automation.nodes === 'string' ? JSON.parse(automation.nodes) : automation.nodes;
    const nodes = flowData.nodes || [];
    const currentNode = nodes.find((n: any) => n.id === matched.currentNodeId);

    if (!currentNode || currentNode.type !== 'instamojo_payment') {
      console.log(`⚠️ Instamojo Webhook: Current node is not instamojo_payment`);
      return res.status(200).json({ success: true });
    }

    const apiKey = currentNode.data?.instamojoApiKey || process.env.INSTAMOJO_API_KEY;
    const authToken = currentNode.data?.instamojoAuthToken || process.env.INSTAMOJO_AUTH_TOKEN;
    const sandbox = currentNode.data?.instamojoSandbox !== undefined ? currentNode.data.instamojoSandbox : (process.env.INSTAMOJO_SANDBOX === 'true');

    if (!apiKey || !authToken) {
      console.error(`❌ Instamojo Webhook: Missing credentials for matched execution`);
      return res.status(500).json({ success: false, message: 'Missing credentials' });
    }

    // Call API live to confirm payment status (security double-check)
    const baseUrl = sandbox ? 'https://test.instamojo.com/api/1.1' : 'https://www.instamojo.com/api/1.1';
    const response = await axios.get(`${baseUrl}/payment-requests/${payment_request_id}/`, {
      headers: {
        'X-Api-Key': apiKey,
        'X-Auth-Token': authToken
      }
    });

    let isPaid = false;
    let finalStatus = 'unknown';
    let confirmedPaymentId = payment_id || '';

    if (response.data && response.data.success && response.data.payment_request) {
      const pr = response.data.payment_request;
      finalStatus = pr.status;
      isPaid = (finalStatus === 'Completed');
      if (pr.payments && pr.payments.length > 0) {
        const lastPayment = pr.payments[pr.payments.length - 1];
        confirmedPaymentId = lastPayment.payment_id || confirmedPaymentId;
      }
    }

    if (isPaid) {
      console.log(`✅ Instamojo Webhook: Payment verified! Waking up execution ${matched.id}`);
      const vars = matched.variables || {};
      vars[currentNode.data?.instamojoVarStatus || 'payment_status'] = 'paid';
      if (confirmedPaymentId) {
        vars[currentNode.data?.instamojoVarPaymentId || 'payment_id'] = confirmedPaymentId;
      }

      await db.update(automationExecutions)
        .set({ variables: vars })
        .where(eq(automationExecutions.id, matched.id));

      const executionService = triggerService.getExecutionService();
      await executionService.handleUserResponse(matched.conversationId, "PAID");
    } else {
      console.log(`❌ Instamojo Webhook: Payment status was not completed: ${finalStatus}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Instamojo webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error });
  }
};

// Tap Payments Webhook Handler
export const tapWebhook = async (req: Request, res: Response) => {
  try {
    let chargeId = req.body.id;
    let status = req.body.status;

    if (req.body.data && req.body.data.id) {
      chargeId = req.body.data.id;
      if (req.body.data.status) {
        status = req.body.data.status;
      }
    }

    console.log(`💳 Tap Webhook: Received callback for charge ${chargeId}, status: ${status}`);

    if (!chargeId) {
      return res.status(200).json({ success: true, message: 'No charge ID in callback' });
    }

    // Find paused execution matching this reference ID
    const pausedExecutions = await db
      .select()
      .from(automationExecutions)
      .where(eq(automationExecutions.status, 'paused'));

    const matched = pausedExecutions.find((exec: any) => {
      const vars = exec.variables || {};
      return Object.values(vars).includes(chargeId);
    });

    if (!matched) {
      console.log(`⚠️ Tap Webhook: No matching paused execution found for charge ${chargeId}`);
      return res.status(200).json({ success: true, message: 'No execution matched' });
    }

    console.log(`▶️ Tap Webhook: Found matching execution ${matched.id}. Triggering verification...`);

    // Fetch automation to find the node config
    const automation = await db.query.automations.findFirst({
      where: eq(automations.id, matched.automationId),
    });

    if (!automation || !automation.nodes) {
      return res.status(500).json({ success: false, message: 'Automation not found' });
    }

    const flowData = typeof automation.nodes === 'string' ? JSON.parse(automation.nodes) : automation.nodes;
    const nodes = flowData.nodes || [];
    const currentNode = nodes.find((n: any) => n.id === matched.currentNodeId);

    if (!currentNode || currentNode.type !== 'tap_payment') {
      console.log(`⚠️ Tap Webhook: Current node is not tap_payment`);
      return res.status(200).json({ success: true });
    }

    const secretKey = currentNode.data?.tapSecretKey || process.env.TAP_SECRET_KEY;

    if (!secretKey) {
      console.error(`❌ Tap Webhook: Missing secret key for matched execution`);
      return res.status(500).json({ success: false, message: 'Missing secret key' });
    }

    // Call API live to confirm charge status (security double-check)
    const response = await axios.get(`https://api.tap.company/v2/charges/${chargeId}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'accept': 'application/json'
      }
    });

    let isPaid = false;
    let finalStatus = 'unknown';

    if (response.data && response.data.id) {
      finalStatus = response.data.status;
      isPaid = (finalStatus === 'CAPTURED');
    }

    if (isPaid) {
      console.log(`✅ Tap Webhook: Payment verified! Waking up execution ${matched.id}`);
      const vars = matched.variables || {};
      vars[currentNode.data?.tapVarStatus || 'payment_status'] = 'paid';
      vars[currentNode.data?.tapVarPaymentId || 'payment_id'] = chargeId;

      await db.update(automationExecutions)
        .set({ variables: vars })
        .where(eq(automationExecutions.id, matched.id));

      const executionService = triggerService.getExecutionService();
      await executionService.handleUserResponse(matched.conversationId, "PAID");
    } else {
      console.log(`❌ Tap Webhook: Payment status was not completed: ${finalStatus}`);
      if (finalStatus === 'FAILED' || finalStatus === 'DECLINED' || finalStatus === 'CANCELLED') {
        console.log(`❌ Tap Webhook: Payment failed, waking up execution with UNPAID branch`);
        const vars = matched.variables || {};
        vars[currentNode.data?.tapVarStatus || 'payment_status'] = 'failed';
        
        await db.update(automationExecutions)
          .set({ variables: vars })
          .where(eq(automationExecutions.id, matched.id));

        const executionService = triggerService.getExecutionService();
        await executionService.handleUserResponse(matched.conversationId, "UNPAID");
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Tap webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error });
  }
};

// Helper to decode JWS payload
function decodeJWSPayload(jwsToken: string): any {
  try {
    const parts = jwsToken.split('.');
    if (parts.length === 3) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(jsonPayload);
    }
  } catch (err) {
    console.error('Failed to decode JWS payload:', err);
  }
  return null;
}

// Noon Payments Webhook Handler
export const noonWebhook = async (req: Request, res: Response) => {
  try {
    let orderId = req.body?.orderId || req.body?.order?.id;
    let status = req.body?.order?.status;

    // Check if the body contains a JWS token instead (e.g. from version 2 webhook)
    if (!orderId) {
      let rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const match = rawBody.match(/([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)/);
      if (match) {
        const decoded = decodeJWSPayload(match[0]);
        if (decoded && decoded.order) {
          orderId = decoded.order.id;
          status = decoded.order.status;
        }
      }
    }

    console.log(`💳 Noon Webhook: Received callback for order ID: ${orderId}, status: ${status}`);

    if (!orderId) {
      return res.status(200).json({ success: true, message: 'No order ID in callback' });
    }

    // Find paused execution matching this order ID
    const pausedExecutions = await db
      .select()
      .from(automationExecutions)
      .where(eq(automationExecutions.status, 'paused'));

    const matched = pausedExecutions.find((exec: any) => {
      const vars = exec.variables || {};
      return Object.values(vars).includes(String(orderId));
    });

    if (!matched) {
      console.log(`⚠️ Noon Webhook: No matching paused execution found for order ID: ${orderId}`);
      return res.status(200).json({ success: true, message: 'No execution matched' });
    }

    console.log(`▶️ Noon Webhook: Found matching execution ${matched.id}. Triggering verification...`);

    // Fetch automation to find the node config
    const automation = await db.query.automations.findFirst({
      where: eq(automations.id, matched.automationId),
    });

    if (!automation || !automation.nodes) {
      return res.status(500).json({ success: false, message: 'Automation not found' });
    }

    const flowData = typeof automation.nodes === 'string' ? JSON.parse(automation.nodes) : automation.nodes;
    const nodes = flowData.nodes || [];
    const currentNode = nodes.find((n: any) => n.id === matched.currentNodeId);

    if (!currentNode || currentNode.type !== 'noon_payment') {
      console.log(`⚠️ Noon Webhook: Current node is not noon_payment`);
      return res.status(200).json({ success: true });
    }

    const nodeData = (currentNode.data || {}) as any;
    const businessId = nodeData.noonBusinessId || process.env.NOON_BUSINESS_ID;
    const appId = nodeData.noonAppId || process.env.NOON_APP_ID;
    const appKey = nodeData.noonAppKey || process.env.NOON_APP_KEY;
    const sandbox = nodeData.noonSandbox !== undefined ? nodeData.noonSandbox : (process.env.NOON_SANDBOX === 'true');

    if (!businessId || !appId || !appKey) {
      console.error(`❌ Noon Webhook: Missing credentials for matched execution`);
      return res.status(500).json({ success: false, message: 'Missing credentials' });
    }

    const authString = `${businessId}:${appId}:${appKey}`;
    const encodedAuth = Buffer.from(authString).toString('base64');
    const baseUrl = sandbox
      ? 'https://api-test.noonpayments.com/payment/v1'
      : 'https://api.noonpayments.com/payment/v1';

    // Call GET API live to confirm order status (security double-check)
    const response = await axios.get(`${baseUrl}/order/${orderId}`, {
      headers: {
        'Authorization': `Key ${encodedAuth}`,
        'accept': 'application/json'
      }
    });

    let isPaid = false;
    let finalStatus = 'unknown';

    if (response.data && response.data.resultCode === 0 && response.data.result?.order) {
      finalStatus = response.data.result.order.status;
      isPaid = (finalStatus === 'SUCCESS' || finalStatus === 'CAPTURED');
    }

    if (isPaid) {
      console.log(`✅ Noon Webhook: Payment verified! Waking up execution ${matched.id}`);
      const vars = matched.variables || {};
      vars[nodeData.noonVarStatus || 'payment_status'] = 'paid';
      vars[nodeData.noonVarPaymentId || 'payment_id'] = String(orderId);

      await db.update(automationExecutions)
        .set({ variables: vars })
        .where(eq(automationExecutions.id, matched.id));

      const executionService = triggerService.getExecutionService();
      await executionService.handleUserResponse(matched.conversationId, "PAID");
    } else {
      console.log(`❌ Noon Webhook: Payment status was not completed: ${finalStatus}`);
      if (finalStatus === 'FAILED' || finalStatus === 'FAIL' || finalStatus === 'CANCELLED') {
        console.log(`❌ Noon Webhook: Payment failed, waking up execution with UNPAID branch`);
        const vars = matched.variables || {};
        vars[nodeData.noonVarStatus || 'payment_status'] = 'failed';
        
        await db.update(automationExecutions)
          .set({ variables: vars })
          .where(eq(automationExecutions.id, matched.id));

        const executionService = triggerService.getExecutionService();
        await executionService.handleUserResponse(matched.conversationId, "UNPAID");
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Noon webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error });
  }
};

// Stripe Webhook Handler
export const stripeWebhook = async (req: Request, res: Response) => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe is not configured' });
    }

    const provider = await db
      .select()
      .from(paymentProviders)
      .where(and(eq(paymentProviders.providerKey, "stripe"), eq(paymentProviders.isActive, true)))
      .limit(1);

    const webhookSecret =
      provider[0]?.config?.webhookSecret ||
      process.env.STRIPE_WEBHOOK_SECRET || '';
    const signature = req.headers['stripe-signature'] as string;

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error('Stripe signature verification failed:', err.message);
      return res.status(400).json({
        success: false,
        message: `Webhook signature verification failed: ${err.message}`
      });
    }

    const eventType = event.type;
    console.log('Stripe Webhook Event:', eventType);

    switch (eventType) {
      case 'payment_intent.succeeded':
        await handleStripePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handleStripePaymentIntentFailed(event.data.object);
        break;
      case 'charge.succeeded':
        await handleStripeChargeSucceeded(event.data.object);
        break;
      case 'charge.refunded':
        await handleStripeChargeRefunded(event.data.object);
        break;
      case 'invoice.paid':
        await handleStripeInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleStripeInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleStripeSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleStripeSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleStripeSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log('Unhandled Stripe event:', eventType);
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error });
  }
};

// ==================== RAZORPAY HANDLERS ====================

async function handleRazorpayPaymentAuthorized(event: any) {
  const payment = event.payload.payment.entity;
  console.log('Razorpay payment authorized:', payment.id);

  await updateTransactionByProviderOrderId(
    payment.order_id,
    {
      status: 'authorized',
      providerPaymentId: payment.id,
      metadata: {
        method: payment.method,
        amount: payment.amount / 100,
        currency: payment.currency
      }
    }
  );
}

async function handleRazorpayPaymentCaptured(event: any) {
  const payment = event.payload.payment.entity;
  console.log('Razorpay payment captured:', payment.id);

  const transaction =
    (await findTransactionByProviderOrderId(payment.order_id)) ||
    (await findTransactionByProviderTransactionId(payment.invoice_id));

  if (transaction) {
    await db.update(transactions)
      .set({
        status: 'completed',
        providerPaymentId: payment.id,
        paidAt: new Date(),
        metadata: {
          method: payment.method,
          amount: payment.amount / 100,
          currency: payment.currency,
          cardId: payment.card_id,
          bank: payment.bank,
          wallet: payment.wallet
        },
        updatedAt: new Date()
      })
      .where(eq(transactions.id, transaction.id));

    await createSubscriptionFromTransaction(transaction, null, "razorpay");
  }

  // Also check if this payment was for an active automation payment link
  if (payment.payment_link_id) {
    await handleRazorpayPaymentLinkPaid({
      payload: {
        payment_link: {
          entity: {
            id: payment.payment_link_id,
            status: 'paid',
            payments: [
              { payment_id: payment.id }
            ]
          }
        }
      }
    });
  }
}

async function handleRazorpayPaymentLinkPaid(event: any) {
  const paymentLink = event.payload.payment_link.entity;
  const paymentLinkId = paymentLink.id;
  const status = paymentLink.status; // 'paid'
  const paymentId = paymentLink.payments && paymentLink.payments.length > 0
    ? paymentLink.payments[paymentLink.payments.length - 1].payment_id || ''
    : '';

  console.log(`💳 Razorpay Webhook: Payment link paid: ${paymentLinkId}`);

  try {
    const pausedExecutions = await db
      .select()
      .from(automationExecutions)
      .where(eq(automationExecutions.status, 'paused'));

    const matched = pausedExecutions.find((exec: any) => {
      const vars = exec.variables || {};
      return Object.values(vars).includes(paymentLinkId);
    });

    if (matched) {
      console.log(`▶️ Webhook: Waking up execution ${matched.id} because payment link ${paymentLinkId} was paid`);
      
      const vars = matched.variables || {};
      vars.payment_status = status;
      if (paymentId) {
        vars.payment_id = paymentId;
      }

      // Update variables in the database
      await db.update(automationExecutions)
        .set({ variables: vars })
        .where(eq(automationExecutions.id, matched.id));
      
      const executionService = triggerService.getExecutionService();
      await executionService.handleUserResponse(matched.conversationId, "PAID");
    } else {
      console.log(`ℹ️ Webhook: No matching paused automation execution found for payment link ${paymentLinkId}`);
    }
  } catch (err) {
    console.error('Error handling Razorpay payment link webhook:', err);
  }
}

async function handleRazorpayPaymentFailed(event: any) {
  const payment = event.payload.payment.entity;
  console.log('Razorpay payment failed:', payment.id);

  await updateTransactionByProviderOrderId(
    payment.order_id,
    {
      status: 'failed',
      providerPaymentId: payment.id,
      metadata: {
        errorCode: payment.error_code,
        errorDescription: payment.error_description,
        errorReason: payment.error_reason
      }
    }
  );
}

async function handleRazorpayOrderPaid(event: any) {
  const order = event.payload.order.entity;
  console.log('Razorpay order paid:', order.id);

  await updateTransactionByProviderOrderId(
    order.id,
    {
      status: 'completed',
      paidAt: new Date()
    }
  );
}

async function handleRazorpayRefundCreated(event: any) {
  const refund = event.payload.refund.entity;
  console.log('Razorpay refund created:', refund.id);

  await updateTransactionByProviderPaymentId(
    refund.payment_id,
    {
      status: 'refunded',
      refundedAt: new Date(),
      metadata: {
        refundId: refund.id,
        refundAmount: refund.amount / 100
      }
    }
  );
}

async function handleRazorpaySubscriptionActivated(event: any) {
  const sub = event.payload.subscription.entity;
  console.log('Razorpay subscription activated:', sub.id);

  const existingSub = await findSubscriptionByGatewayId(sub.id);
  if (existingSub) {
    await db.update(subscriptions)
      .set({
        status: 'active',
        gatewayStatus: sub.status || 'active',
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSub.id));
    console.log('Razorpay subscription activated in DB:', existingSub.id);
  }
}

async function handleRazorpaySubscriptionCharged(event: any) {
  const sub = event.payload.subscription.entity;
  const payment = event.payload.payment?.entity;
  console.log('Razorpay subscription charged:', sub.id, 'payment:', payment?.id);

  const existingSub = await findSubscriptionByGatewayId(sub.id);
  if (existingSub) {
    let newStartDate = new Date();
    let newEndDate: Date;

    if (sub.current_end) {
      newEndDate = new Date(sub.current_end * 1000);
    } else if (sub.charge_at) {
      newEndDate = new Date(sub.charge_at * 1000);
    } else {
      newEndDate = new Date();
      if (existingSub.billingCycle === 'annual') {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else {
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      }
    }

    if (sub.current_start) {
      newStartDate = new Date(sub.current_start * 1000);
    }

    await db.update(subscriptions)
      .set({
        status: 'active',
        gatewayStatus: 'active',
        startDate: newStartDate,
        endDate: newEndDate,
        autoRenew: true,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSub.id));
    console.log('Razorpay subscription renewed in DB:', existingSub.id);
  }
}

async function handleRazorpaySubscriptionCancelled(event: any) {
  const sub = event.payload.subscription.entity;
  console.log('Razorpay subscription cancelled:', sub.id);

  const existingSub = await findSubscriptionByGatewayId(sub.id);
  if (existingSub) {
    await db.update(subscriptions)
      .set({
        status: 'cancelled',
        gatewayStatus: 'cancelled',
        autoRenew: false,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSub.id));
    console.log('Razorpay subscription cancelled in DB:', existingSub.id);
  }
}

async function handleRazorpaySubscriptionHalted(event: any) {
  const sub = event.payload.subscription.entity;
  console.log('Razorpay subscription halted:', sub.id);

  const existingSub = await findSubscriptionByGatewayId(sub.id);
  if (existingSub) {
    await db.update(subscriptions)
      .set({
        status: 'active',
        gatewayStatus: 'halted',
        autoRenew: false,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSub.id));
  }
}

async function handleRazorpaySubscriptionCompleted(event: any) {
  const sub = event.payload.subscription.entity;
  console.log('Razorpay subscription completed:', sub.id);

  const existingSub = await findSubscriptionByGatewayId(sub.id);
  if (existingSub) {
    await db.update(subscriptions)
      .set({
        status: 'expired',
        gatewayStatus: 'completed',
        autoRenew: false,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSub.id));
  }
}

// ==================== STRIPE HANDLERS ====================

async function handleStripePaymentIntentSucceeded(paymentIntent: any) {
  console.log('Stripe payment intent succeeded:', paymentIntent.id);

  const transaction = await findTransactionByProviderTransactionId(paymentIntent.id);

  if (transaction) {
    await db.update(transactions)
      .set({
        status: 'completed',
        paidAt: new Date(),
        metadata: {
          paymentMethod: paymentIntent.payment_method,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency
        },
        updatedAt: new Date()
      })
      .where(eq(transactions.id, transaction.id));

    await createSubscriptionFromTransaction(transaction, null, "stripe");
  }
}

async function handleStripePaymentIntentFailed(paymentIntent: any) {
  console.log('Stripe payment intent failed:', paymentIntent.id);

  await updateTransactionByProviderTransactionId(
    paymentIntent.id,
    {
      status: 'failed',
      metadata: {
        errorMessage: paymentIntent.last_payment_error?.message,
        errorCode: paymentIntent.last_payment_error?.code
      }
    }
  );
}

async function handleStripeChargeSucceeded(charge: any) {
  console.log('Stripe charge succeeded:', charge.id);

  await updateTransactionByProviderTransactionId(
    charge.payment_intent,
    {
      providerPaymentId: charge.id,
      metadata: {
        cardLast4: charge.payment_method_details?.card?.last4,
        cardBrand: charge.payment_method_details?.card?.brand,
        receiptUrl: charge.receipt_url
      }
    }
  );
}

async function handleStripeChargeRefunded(charge: any) {
  console.log('Stripe charge refunded:', charge.id);

  await updateTransactionByProviderPaymentId(
    charge.id,
    {
      status: 'refunded',
      refundedAt: new Date(),
      metadata: {
        refundAmount: charge.amount_refunded / 100
      }
    }
  );
}

async function handleStripeInvoicePaid(invoice: any) {
  console.log('Stripe invoice paid:', invoice.id);

  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;

  const existingSub = await findSubscriptionByGatewayId(stripeSubId);
  if (existingSub) {
    const periodEnd = invoice.lines?.data?.[0]?.period?.end;
    const newEndDate = periodEnd ? new Date(periodEnd * 1000) : null;

    const updateData: any = {
      status: 'active',
      gatewayStatus: 'active',
      autoRenew: true,
      updatedAt: new Date()
    };
    if (newEndDate) {
      updateData.endDate = newEndDate;
      updateData.startDate = new Date();
    }

    await db.update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, existingSub.id));
    console.log('Stripe subscription renewed via invoice:', existingSub.id);
  }
}

async function handleStripeInvoicePaymentFailed(invoice: any) {
  console.log('Stripe invoice payment failed:', invoice.id);

  const stripeSubId = invoice.subscription;
  if (!stripeSubId) return;

  const existingSub = await findSubscriptionByGatewayId(stripeSubId);
  if (existingSub) {
    await db.update(subscriptions)
      .set({
        gatewayStatus: 'past_due',
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSub.id));
    console.log('Stripe subscription marked past_due:', existingSub.id);
  }
}

async function handleStripeSubscriptionCreated(subscription: any) {
  console.log('Stripe subscription created:', subscription.id);

  const existingSub = await findSubscriptionByGatewayId(subscription.id);
  if (existingSub) {
    await db.update(subscriptions)
      .set({
        gatewayStatus: subscription.status,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSub.id));
  }
}

async function handleStripeSubscriptionUpdated(subscription: any) {
  console.log('Stripe subscription updated:', subscription.id);

  const existingSub = await findSubscriptionByGatewayId(subscription.id);
  if (existingSub) {
    const updateData: any = {
      gatewayStatus: subscription.status,
      updatedAt: new Date()
    };

    if (subscription.cancel_at_period_end) {
      updateData.autoRenew = false;
      updateData.gatewayStatus = 'cancel_at_period_end';
    }

    if (subscription.status === 'active' && !subscription.cancel_at_period_end) {
      updateData.status = 'active';
      updateData.autoRenew = true;
    }

    if (subscription.current_period_end) {
      updateData.endDate = new Date(subscription.current_period_end * 1000);
    }
    if (subscription.current_period_start) {
      updateData.startDate = new Date(subscription.current_period_start * 1000);
    }

    const newPriceId = subscription.items?.data?.[0]?.price?.id;
    if (newPriceId) {
      const matchingPlan = await db
        .select()
        .from(plans)
        .where(eq(plans.stripePriceIdMonthly, newPriceId))
        .limit(1);

      const matchingPlanAnnual = matchingPlan.length === 0
        ? await db
            .select()
            .from(plans)
            .where(eq(plans.stripePriceIdAnnual, newPriceId))
            .limit(1)
        : [];

      const plan = matchingPlan[0] || matchingPlanAnnual[0];
      if (plan && plan.id !== existingSub.planId) {
        updateData.planId = plan.id;
        updateData.billingCycle = matchingPlanAnnual.length > 0 ? 'annual' : 'monthly';
        updateData.planData = {
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice,
          permissions: plan.permissions,
          features: plan.features,
        };

        await db.update(users)
          .set({ planId: plan.id, updatedAt: new Date() })
          .where(eq(users.id, existingSub.userId));
      }
    }

    await db.update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, existingSub.id));
    console.log('Stripe subscription updated in DB:', existingSub.id);
  }
}

async function handleStripeSubscriptionDeleted(subscription: any) {
  console.log('Stripe subscription deleted:', subscription.id);

  const existingSub = await findSubscriptionByGatewayId(subscription.id);
  if (existingSub) {
    await db.update(subscriptions)
      .set({
        status: 'cancelled',
        gatewayStatus: 'canceled',
        autoRenew: false,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existingSub.id));
    console.log('Stripe subscription cancelled in DB:', existingSub.id);
  }
}

// ==================== HELPER FUNCTIONS ====================

async function findSubscriptionByGatewayId(gatewayId: string) {
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.gatewaySubscriptionId, gatewayId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

async function findTransactionByProviderOrderId(orderId: string) {
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.providerOrderId, orderId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

async function findTransactionByProviderTransactionId(transactionId: string) {
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.providerTransactionId, transactionId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

async function findTransactionByProviderPaymentId(paymentId: string) {
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.providerPaymentId, paymentId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

async function updateTransactionByProviderOrderId(orderId: string, updateData: any) {
  const transaction = await findTransactionByProviderOrderId(orderId);
  if (transaction) {
    await db.update(transactions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(transactions.id, transaction.id));
  }
}

async function updateTransactionByProviderTransactionId(transactionId: string, updateData: any) {
  const transaction = await findTransactionByProviderTransactionId(transactionId);
  if (transaction) {
    await db.update(transactions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(transactions.id, transaction.id));
  }
}

async function updateTransactionByProviderPaymentId(paymentId: string, updateData: any) {
  const transaction = await findTransactionByProviderPaymentId(paymentId);
  if (transaction) {
    await db.update(transactions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(transactions.id, transaction.id));
  }
}

async function createSubscriptionFromTransaction(
  transaction: any,
  gatewaySubscriptionId?: string | null,
  gatewayProvider?: string | null
) {
  if (transaction.subscriptionId) {
    return;
  }

  const planData = await db
    .select()
    .from(plans)
    .where(eq(plans.id, transaction.planId))
    .limit(1);

  const plan = planData[0] || null;

  const startDate = new Date();
  const endDate = new Date();

  if (transaction.billingCycle === 'annual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  await db
    .update(subscriptions)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(subscriptions.userId, transaction.userId),
        eq(subscriptions.status, 'active')
      )
    );

  const newSubscription = await db
    .insert(subscriptions)
    .values({
      userId: transaction.userId,
      planId: transaction.planId,
      planData: plan
        ? {
            name: plan.name,
            description: plan.description,
            monthlyPrice: plan.monthlyPrice,
            annualPrice: plan.annualPrice,
            permissions: plan.permissions,
            features: plan.features,
          }
        : undefined,
      status: 'active',
      billingCycle: transaction.billingCycle,
      startDate,
      endDate,
      autoRenew: true,
      currency: transaction.currency || 'USD',
      gatewaySubscriptionId: gatewaySubscriptionId || transaction.providerTransactionId || null,
      gatewayProvider: gatewayProvider || null,
      gatewayStatus: 'active',
    })
    .returning();

  await db
    .update(transactions)
    .set({ subscriptionId: newSubscription[0].id })
    .where(eq(transactions.id, transaction.id));

  if (transaction.userId) {
    await db
      .update(users)
      .set({ planId: transaction.planId, updatedAt: new Date() })
      .where(eq(users.id, transaction.userId));
  }

  console.log('Subscription created from webhook:', newSubscription[0].id);
}

// ==================== PAYPAL WEBHOOK ====================

export const paypalWebhook = async (req: Request, res: Response) => {
  try {
    const provider = await db
      .select()
      .from(paymentProviders)
      .where(and(eq(paymentProviders.providerKey, "paypal"), eq(paymentProviders.isActive, true)))
      .limit(1);

    if (!provider.length) {
      return res.status(400).json({ success: false, message: 'PayPal is not configured' });
    }

    const webhookId = provider[0]?.config?.webhookId || '';

    const headers = req.headers;
    const transmissionId = headers['paypal-transmission-id'] as string;
    const transmissionTime = headers['paypal-transmission-time'] as string;
    const certUrl = headers['paypal-cert-url'] as string;
    const transmissionSig = headers['paypal-transmission-sig'] as string;
    const authAlgo = headers['paypal-auth-algo'] as string;

    const parsedBody = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

    if (webhookId && transmissionId && transmissionSig) {
      try {
        const isLive = provider[0]?.config?.isLive === true;
        const baseUrl = isLive
          ? "https://api-m.paypal.com"
          : "https://api-m.sandbox.paypal.com";

        const clientId = isLive
          ? provider[0].config?.apiKey
          : provider[0].config?.apiKeyTest || provider[0].config?.apiKey;
        const clientSecret = isLive
          ? provider[0].config?.apiSecret
          : provider[0].config?.apiSecretTest || provider[0].config?.apiSecret;

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const tokenRes = await axios.post(
          `${baseUrl}/v1/oauth2/token`,
          "grant_type=client_credentials",
          { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" } }
        );
        const accessToken = tokenRes.data.access_token;

        const verifyRes = await axios.post(
          `${baseUrl}/v1/notifications/verify-webhook-signature`,
          {
            auth_algo: authAlgo,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: transmissionSig,
            transmission_time: transmissionTime,
            webhook_id: webhookId,
            webhook_event: parsedBody,
          },
          { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
        );

        if (verifyRes.data.verification_status !== 'SUCCESS') {
          console.warn('PayPal webhook signature verification failed');
          return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
        }
      } catch (verifyErr) {
        console.error('PayPal webhook signature verification error:', verifyErr);
      }
    }

    const event = parsedBody;
    const eventType = event.event_type;
    const resource = event.resource;

    console.log('PayPal Webhook Event:', eventType);

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subId = resource.id;
        const existingSub = await findSubscriptionByGatewayId(subId);
        if (existingSub) {
          await db.update(subscriptions)
            .set({
              status: 'active',
              gatewayStatus: 'ACTIVE',
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, existingSub.id));
          console.log('PayPal subscription activated:', subId);
        }
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        const billingAgreementId = resource.billing_agreement_id;
        if (billingAgreementId) {
          const existingSub = await findSubscriptionByGatewayId(billingAgreementId);
          if (existingSub) {
            let newEndDate = new Date();
            if (existingSub.billingCycle === 'annual') {
              newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            } else {
              newEndDate.setMonth(newEndDate.getMonth() + 1);
            }

            await db.update(subscriptions)
              .set({
                status: 'active',
                gatewayStatus: 'ACTIVE',
                startDate: new Date(),
                endDate: newEndDate,
                autoRenew: true,
                updatedAt: new Date()
              })
              .where(eq(subscriptions.id, existingSub.id));
            console.log('PayPal subscription payment completed:', billingAgreementId);
          }

          const transaction = await findTransactionByProviderTransactionId(billingAgreementId);
          if (transaction) {
            await db.update(transactions)
              .set({
                status: 'completed',
                providerPaymentId: resource.id,
                paidAt: new Date(),
                metadata: {
                  amount: parseFloat(resource.amount?.total || '0'),
                  currency: resource.amount?.currency,
                },
                updatedAt: new Date()
              })
              .where(eq(transactions.id, transaction.id));

            await createSubscriptionFromTransaction(transaction, billingAgreementId, "paypal");
          }
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const subId = resource.id;
        const existingSub = await findSubscriptionByGatewayId(subId);
        if (existingSub) {
          await db.update(subscriptions)
            .set({
              status: 'cancelled',
              gatewayStatus: 'CANCELLED',
              autoRenew: false,
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, existingSub.id));
          console.log('PayPal subscription cancelled:', subId);
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const subId = resource.id;
        const existingSub = await findSubscriptionByGatewayId(subId);
        if (existingSub) {
          await db.update(subscriptions)
            .set({
              gatewayStatus: 'SUSPENDED',
              autoRenew: false,
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, existingSub.id));
          console.log('PayPal subscription suspended:', subId);
        }
        break;
      }

      default:
        console.log('Unhandled PayPal event:', eventType);
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error });
  }
};

// ==================== PAYSTACK WEBHOOK ====================

export const paystackWebhook = async (req: Request, res: Response) => {
  try {
    const provider = await db
      .select()
      .from(paymentProviders)
      .where(and(eq(paymentProviders.providerKey, "paystack"), eq(paymentProviders.isActive, true)))
      .limit(1);

    if (!provider.length) {
      return res.status(400).json({ success: false, message: 'Paystack is not configured' });
    }

    const secretKey =
      provider[0]?.config?.apiSecret ||
      provider[0]?.config?.apiSecretTest || '';

    const signature = req.headers['x-paystack-signature'] as string;

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const expectedSignature = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;
    const eventType = event.event;
    const data = event.data;

    console.log('Paystack Webhook Event:', eventType);

    switch (eventType) {
      case 'charge.success': {
        const reference = data.reference;
        const transaction = await findTransactionByProviderTransactionId(reference);

        if (transaction) {
          await db.update(transactions)
            .set({
              status: 'completed',
              providerPaymentId: String(data.id),
              paidAt: new Date(),
              metadata: {
                method: data.channel,
                amount: data.amount / 100,
                currency: data.currency,
                cardLast4: data.authorization?.last4,
                cardBrand: data.authorization?.brand,
                bank: data.authorization?.bank,
              },
              updatedAt: new Date()
            })
            .where(eq(transactions.id, transaction.id));

          await createSubscriptionFromTransaction(transaction, data.authorization?.authorization_code || null, "paystack");
        }
        break;
      }

      case 'subscription.create': {
        const subCode = data.subscription_code;
        const existingSub = await findSubscriptionByGatewayId(subCode);
        if (existingSub) {
          await db.update(subscriptions)
            .set({
              status: 'active',
              gatewayStatus: 'active',
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, existingSub.id));
          console.log('Paystack subscription created:', subCode);
        }
        break;
      }

      case 'subscription.not_renew': {
        const subCode = data.subscription_code;
        const existingSub = await findSubscriptionByGatewayId(subCode);
        if (existingSub) {
          await db.update(subscriptions)
            .set({
              autoRenew: false,
              gatewayStatus: 'non_renewing',
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, existingSub.id));
          console.log('Paystack subscription not renewing:', subCode);
        }
        break;
      }

      case 'subscription.disable': {
        const subCode = data.subscription_code;
        const existingSub = await findSubscriptionByGatewayId(subCode);
        if (existingSub) {
          await db.update(subscriptions)
            .set({
              status: 'cancelled',
              gatewayStatus: 'cancelled',
              autoRenew: false,
              updatedAt: new Date()
            })
            .where(eq(subscriptions.id, existingSub.id));
          console.log('Paystack subscription disabled:', subCode);
        }
        break;
      }

      default:
        console.log('Unhandled Paystack event:', eventType);
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error });
  }
};

// ==================== MERCADO PAGO WEBHOOK ====================

export const mercadopagoWebhook = async (req: Request, res: Response) => {
  try {
    const provider = await db
      .select()
      .from(paymentProviders)
      .where(and(eq(paymentProviders.providerKey, "mercadopago"), eq(paymentProviders.isActive, true)))
      .limit(1);

    if (!provider.length) {
      return res.status(400).json({ success: false, message: 'Mercado Pago is not configured' });
    }

    const webhookSecret = provider[0]?.config?.webhookSecret || '';
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;

    const parsedBody = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

    if (webhookSecret && xSignature) {
      try {
        const parts: Record<string, string> = {};
        xSignature.split(',').forEach((part: string) => {
          const [key, value] = part.trim().split('=');
          if (key && value) parts[key] = value;
        });

        const ts = parts['ts'];
        const v1 = parts['v1'];
        const dataId = req.query['data.id'] || parsedBody?.data?.id || '';

        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
        const expectedHmac = crypto
          .createHmac('sha256', webhookSecret)
          .update(manifest)
          .digest('hex');

        if (v1 !== expectedHmac) {
          console.warn('Mercado Pago webhook signature verification failed');
          return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
        }
      } catch (sigErr) {
        console.error('Mercado Pago signature verification error:', sigErr);
      }
    }

    const topic = parsedBody.type || req.query.topic;
    const action = parsedBody.action;
    const dataId = parsedBody.data?.id || req.query.id;

    console.log('Mercado Pago Webhook:', topic, action, 'dataId:', dataId);

    const accessToken =
      provider[0].config?.isLive
        ? provider[0].config?.apiSecret
        : provider[0].config?.apiSecretTest || provider[0].config?.apiSecret;

    if (topic === 'payment' && dataId) {
      try {
        const paymentRes = await axios.get(
          `https://api.mercadopago.com/v1/payments/${dataId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const payment = paymentRes.data;

        if (payment.status === 'approved') {
          let externalRef: any = {};
          try {
            externalRef = JSON.parse(payment.external_reference || '{}');
          } catch {}

          const preapprovalId = payment.metadata?.preapproval_id || externalRef.subscriptionId;

          if (preapprovalId) {
            const existingSub = await findSubscriptionByGatewayId(preapprovalId);
            if (existingSub) {
              let newEndDate = new Date();
              if (existingSub.billingCycle === 'annual') {
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
              } else {
                newEndDate.setMonth(newEndDate.getMonth() + 1);
              }

              await db.update(subscriptions)
                .set({
                  status: 'active',
                  gatewayStatus: 'authorized',
                  startDate: new Date(),
                  endDate: newEndDate,
                  autoRenew: true,
                  updatedAt: new Date()
                })
                .where(eq(subscriptions.id, existingSub.id));
              console.log('Mercado Pago payment approved for subscription:', preapprovalId);
            }
          }

          const transaction = await findTransactionByProviderTransactionId(String(dataId));
          if (transaction) {
            await db.update(transactions)
              .set({
                status: 'completed',
                providerPaymentId: String(payment.id),
                paidAt: new Date(),
                metadata: {
                  amount: payment.transaction_amount,
                  currency: payment.currency_id,
                  paymentMethod: payment.payment_method_id,
                  paymentType: payment.payment_type_id,
                },
                updatedAt: new Date()
              })
              .where(eq(transactions.id, transaction.id));

            await createSubscriptionFromTransaction(transaction, preapprovalId || null, "mercadopago");
          }
        }
      } catch (fetchErr) {
        console.error('Mercado Pago: Error fetching payment details:', fetchErr);
      }
    }

    if ((topic === 'subscription_preapproval' || action?.includes('updated') || action?.includes('created')) && dataId) {
      try {
        const subRes = await axios.get(
          `https://api.mercadopago.com/preapproval/${dataId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const preapproval = subRes.data;

        const existingSub = await findSubscriptionByGatewayId(String(dataId));
        if (existingSub) {
          const statusMap: Record<string, string> = {
            authorized: 'active',
            paused: 'active',
            cancelled: 'cancelled',
            pending: 'active',
          };

          const newStatus = statusMap[preapproval.status] || existingSub.status;
          const updateData: any = {
            gatewayStatus: preapproval.status,
            updatedAt: new Date()
          };

          if (preapproval.status === 'cancelled') {
            updateData.status = 'cancelled';
            updateData.autoRenew = false;
          } else if (preapproval.status === 'authorized') {
            updateData.status = 'active';
            updateData.autoRenew = true;
          } else if (preapproval.status === 'paused') {
            updateData.autoRenew = false;
          }

          await db.update(subscriptions)
            .set(updateData)
            .where(eq(subscriptions.id, existingSub.id));
          console.log('Mercado Pago subscription updated:', dataId, '->', preapproval.status);
        }
      } catch (fetchErr) {
        console.error('Mercado Pago: Error fetching preapproval details:', fetchErr);
      }
    }

    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Mercado Pago webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error });
  }
};

async function handleSmbMessageEchoes(value: any) {
  const { message_echoes, metadata } = value;

  if (!message_echoes || message_echoes.length === 0) {
    return;
  }

  const phoneNumberId = metadata?.phone_number_id;
  if (!phoneNumberId) {
    console.error("[smb_message_echoes] No phone_number_id in webhook");
    return;
  }

  const channel = await storage.getChannelByPhoneNumberId(phoneNumberId);
  if (!channel) {
    console.error(`[smb_message_echoes] No channel found for phone_number_id: ${phoneNumberId}`);
    return;
  }

  const waApi = new WhatsAppApiService(channel);

  for (const echo of message_echoes) {
    const { to, id: whatsappMessageId, text, type, timestamp } = echo;

    const customerPhone = to;
    if (!customerPhone) {
      console.error("[smb_message_echoes] No 'to' field in echo message");
      continue;
    }

    const existingMessage = await storage.getMessageByWhatsAppId(whatsappMessageId);
    if (existingMessage) {
      console.log(`[smb_message_echoes] Duplicate message ${whatsappMessageId}, skipping`);
      continue;
    }

    let messageContent = "";
    let mediaId: string | null = null;
    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;
    let mediaSha256: string | null = null;

    if (type === "text" && text) {
      messageContent = text.body;
    } else if (type === "image" && echo.image) {
      messageContent = echo.image.caption || "[Image]";
      mediaId = echo.image.id;
      mediaMimeType = echo.image.mime_type;
      mediaSha256 = echo.image.sha256;
    } else if (type === "document" && echo.document) {
      messageContent = echo.document.caption || `[Document: ${echo.document.filename || "file"}]`;
      mediaId = echo.document.id;
      mediaMimeType = echo.document.mime_type;
      mediaSha256 = echo.document.sha256;
    } else if (type === "audio" && echo.audio) {
      messageContent = "[Audio message]";
      mediaId = echo.audio.id;
      mediaMimeType = echo.audio.mime_type;
      mediaSha256 = echo.audio.sha256;
    } else if (type === "video" && echo.video) {
      messageContent = echo.video.caption || "[Video]";
      mediaId = echo.video.id;
      mediaMimeType = echo.video.mime_type;
      mediaSha256 = echo.video.sha256;
    } else if (type === "location" && echo.location) {
      messageContent = `[Location: ${echo.location.latitude}, ${echo.location.longitude}]`;
    } else if (type === "contacts" && echo.contacts) {
      const contactNames = echo.contacts.map((c: any) => c.name?.formatted_name || "Contact").join(", ");
      messageContent = `[Contact: ${contactNames}]`;
    } else if (type === "sticker" && echo.sticker) {
      messageContent = "[Sticker]";
      mediaId = echo.sticker.id;
      mediaMimeType = echo.sticker.mime_type;
    } else {
      messageContent = `[${type} message]`;
    }

    if (mediaId) {
      try {
        const processedUrl = await processIncomingMedia(mediaId, mediaMimeType || "image/jpeg", waApi);
        mediaUrl = processedUrl || (await waApi.fetchMediaUrl(mediaId));
      } catch (err) {
        console.error("[smb_message_echoes] Failed to fetch media URL:", err);
      }
    }

    let contact = await storage.getContactByPhoneAndChannel(customerPhone, channel.id);
    if (!contact) {
      contact = await storage.createContact({
        name: customerPhone,
        phone: customerPhone,
        channelId: channel.id,
        source: 'whatsapp',
        createdBy: channel.createdBy || undefined,
      });
    }

    let conversation = await storage.getConversationByPhoneAndChannel(customerPhone, channel.id);
    if (!conversation) {
      conversation = await storage.createConversation({
        contactId: contact.id,
        contactPhone: customerPhone,
        contactName: contact.name || customerPhone,
        channelId: channel.id,
        unreadCount: 0,
      });
    } else {
      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessageText: messageContent,
      });
    }

    const echoMetadata = { rawWebhook: echo, originalType: type };

    const newMessage = await storage.createMessage({
      conversationId: conversation.id,
      content: messageContent,
      fromUser: true,
      direction: "outbound",
      status: "sent",
      whatsappMessageId,
      messageType: type,
      timestamp: new Date(parseInt(timestamp, 10) * 1000),
      mediaId,
      mediaUrl,
      mediaMimeType,
      mediaSha256,
      metadata: echoMetadata,
    });

    const io = (global as any).io;
    if (io) {
      const channelRoom = `channel:${channel.id}`;
      const conversationRoom = `conversation:${conversation.id}`;

      const normalizedPayload = {
        type: "new-message",
        conversationId: conversation.id,
        content: messageContent,
        createdAt: new Date().toISOString(),
        messageType: type,
        from: "business_app",
      };

      io.to(channelRoom).emit("new-message", normalizedPayload);
      io.to(conversationRoom).emit("new-message", normalizedPayload);
      console.log("[smb_message_echoes] Emitted echo message to rooms");
    }

    console.log(`[smb_message_echoes] Stored echo message ${whatsappMessageId} to ${customerPhone} in channel ${channel.id}`);
  }
}

async function handleSmbAppStateSync(value: any) {
  const { metadata, contacts: syncContacts } = value;

  if (!syncContacts || syncContacts.length === 0) {
    console.log("[smb_app_state_sync] No contacts to sync");
    return;
  }

  const phoneNumberId = metadata?.phone_number_id;
  if (!phoneNumberId) {
    console.error("[smb_app_state_sync] No phone_number_id in webhook");
    return;
  }

  const channel = await storage.getChannelByPhoneNumberId(phoneNumberId);
  if (!channel) {
    console.error(`[smb_app_state_sync] No channel found for phone_number_id: ${phoneNumberId}`);
    return;
  }

  for (const syncContact of syncContacts) {
    const phone = syncContact.wa_id;
    const name = syncContact.profile?.name || syncContact.name?.formatted_name;

    if (!phone) continue;

    let existingContact = await storage.getContactByPhoneAndChannel(phone, channel.id);

    if (!existingContact) {
      await storage.createContact({
        name: name || phone,
        phone,
        channelId: channel.id,
        source: 'whatsapp',
        createdBy: channel.createdBy || undefined,
      });
      console.log(`[smb_app_state_sync] Created contact ${phone} for channel ${channel.id}`);
    } else if (name && existingContact.name !== name) {
      await storage.updateContact(existingContact.id, { name });
      console.log(`[smb_app_state_sync] Updated contact name ${phone} -> ${name} for channel ${channel.id}`);
    }
  }
}