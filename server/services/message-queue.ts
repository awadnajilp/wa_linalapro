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

import { db } from "../db";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { messageQueue, channels, campaigns, users, conversations, messages, templates, campaignRecipients, contacts } from "@shared/schema";
import { eq, and, lte, or, isNull, sql, inArray, notInArray } from "drizzle-orm";
import { BaileysManager } from "./baileys-manager";
import { WhatsAppApiService } from "./whatsapp-api";
import { storage } from '../storage';
import { getWhatsAppError } from '@shared/whatsapp-error-codes';
import { cacheGet, CACHE_KEYS, CACHE_TTL } from './cache';
import { initBullQueue, isBullQueueAvailable, addBulkMessagesToBullQueue, getBullQueueStats } from './bull-queue';
import { triggerNotification, NOTIFICATION_EVENTS } from './notification.service';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const SEND_DELAY_MS = parseInt(process.env.MESSAGE_SEND_DELAY_MS || "0", 10);

export class MessageQueueService {
  private static isProcessing = false;
  private static processingTimeout: NodeJS.Timeout | null = null;
  private static currentBackoffMs = 5000;
  private static readonly MIN_BACKOFF_MS = 5000;
  private static readonly MAX_BACKOFF_MS = 30000;
  private static readonly BATCH_SIZE = process.env.MESSAGE_QUEUE_BATCH_SIZE
    ? parseInt(process.env.MESSAGE_QUEUE_BATCH_SIZE, 10)
    : 200;
  private static usingBullMQ = false;

  static async startProcessing(intervalMs: number = 5000) {
    if (this.processingTimeout) {
      return;
    }

    const bullInitialized = await initBullQueue();
    if (bullInitialized) {
      this.usingBullMQ = true;
      console.log("[MessageQueue] Using BullMQ for message processing (Redis-backed)");
      return;
    }

    this.currentBackoffMs = process.env.MESSAGE_QUEUE_INTERVAL_MS
      ? parseInt(process.env.MESSAGE_QUEUE_INTERVAL_MS, 10)
      : intervalMs;

    this.scheduleNext();

    const defaultConcurrency = WhatsAppApiService.getConcurrencyForTier();
    console.log(`[MessageQueue] Using DB polling (batch: ${this.BATCH_SIZE}, concurrency: ${defaultConcurrency}, interval: ${this.currentBackoffMs}ms)`);
  }

  private static scheduleNext() {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }
    this.processingTimeout = setTimeout(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
      this.scheduleNext();
    }, this.currentBackoffMs);
  }

  static async stopProcessing() {
    if (this.usingBullMQ) {
      const { shutdownBullQueue } = await import('./bull-queue');
      await shutdownBullQueue();
      this.usingBullMQ = false;
      console.log("[MessageQueue] BullMQ processing stopped");
      return;
    }
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
      console.log("[MessageQueue] DB polling processing stopped");
    }
  }

  private static async processQueue() {
    this.isProcessing = true;

    try {
      const lockResult = await db.execute(sql`SELECT pg_try_advisory_lock(42424242) AS acquired`);
      const acquired = (lockResult as any).rows?.[0]?.acquired ?? (lockResult as any)[0]?.acquired;
      if (!acquired) {
        return;
      }

      try {
        await db
          .update(messageQueue)
          .set({ status: "queued" })
          .where(
            and(
              eq(messageQueue.status, "processing"),
              sql`${messageQueue.processedAt} < NOW() - INTERVAL '5 minutes'`
            )
          );

        const messages = await db
          .select({ mq: messageQueue })
          .from(messageQueue)
          .leftJoin(campaigns, eq(messageQueue.campaignId, campaigns.id))
          .where(
            and(
              eq(messageQueue.status, "queued"),
              lte(messageQueue.attempts, 3),
              or(
                isNull(messageQueue.scheduledFor),
                sql`${messageQueue.scheduledFor} <= NOW()`
              ),
              or(
                isNull(messageQueue.campaignId),
                eq(campaigns.status, "sending")
              )
            )
          )
          .limit(this.BATCH_SIZE)
          .then((rows) => rows.map((r) => r.mq));

        if (messages.length === 0) {
          this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, this.MAX_BACKOFF_MS);
          return;
        }

        this.currentBackoffMs = this.MIN_BACKOFF_MS;

        const messageIds = messages.map(m => m.id);
        await db
          .update(messageQueue)
          .set({
            status: "processing",
            processedAt: new Date()
          })
          .where(inArray(messageQueue.id, messageIds));

        const channelIds = [...new Set(messages.map(m => m.channelId).filter(Boolean))];
        const channelCache = new Map<string, any>();
        if (channelIds.length > 0) {
          const fetchedChannels = await db
            .select()
            .from(channels)
            .where(inArray(channels.id, channelIds));
          for (const ch of fetchedChannels) {
            channelCache.set(ch.id, ch);
          }
        }

        const messagesByChannel = new Map<string, any[]>();
        for (const msg of messages) {
          const chId = msg.channelId || "_unknown";
          if (!messagesByChannel.has(chId)) messagesByChannel.set(chId, []);
          messagesByChannel.get(chId)!.push(msg);
        }

        const channelPromises: Promise<void>[] = [];
        for (const [chId, chMessages] of messagesByChannel) {
          const channel = channelCache.get(chId);
          const tier = (channel?.healthDetails as any)?.messaging_limit as string | undefined;
          const concurrency = WhatsAppApiService.getConcurrencyForTier(tier);

          channelPromises.push(
            this.processChannelBatch(chMessages, channelCache, concurrency)
          );
        }
        await Promise.all(channelPromises);

        await this.checkCampaignCompletions(messages);
      } finally {
        await db.execute(sql`SELECT pg_advisory_unlock(42424242)`);
      }
    } catch (error) {
      console.error("[MessageQueue] Error processing queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private static async processChannelBatch(
    messages: any[],
    channelCache: Map<string, any>,
    concurrency: number
  ): Promise<void> {
    let active = 0;
    let index = 0;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let completed = 0;
      const total = messages.length;

      const launchNext = () => {
        while (active < concurrency && index < total) {
          const msg = messages[index++];
          active++;

          (async () => {
            try {
              await this.processMessage(msg, channelCache);
            } catch (err) {
              console.error(`[MessageQueue] Unhandled error processing message ${msg.id}:`, err);
            } finally {
              active--;
              completed++;

              if (SEND_DELAY_MS > 0) {
                await sleep(SEND_DELAY_MS);
              }

              if (completed === total && !settled) {
                settled = true;
                resolve();
              } else {
                launchNext();
              }
            }
          })();
        }

        if (completed === total && !settled) {
          settled = true;
          resolve();
        }
      };

      launchNext();
    });
  }

  private static async checkCampaignCompletions(processedMessages: any[]) {
    const campaignIds = [...new Set(
      processedMessages.map((m) => m.campaignId).filter(Boolean)
    )];

    for (const campaignId of campaignIds) {
      try {
        const pending = await db
          .select({ id: messageQueue.id })
          .from(messageQueue)
          .where(
            and(
              eq(messageQueue.campaignId, campaignId),
              notInArray(messageQueue.status, ["sent", "failed"])
            )
          )
          .limit(1);

        if (pending.length > 0) continue;

        const campaign = await storage.getCampaign(campaignId);
        if (!campaign || campaign.status === "completed") continue;

        await storage.updateCampaign(campaignId, {
          status: "completed",
          completedAt: new Date(),
        });

        console.log(`[MessageQueue] Campaign ${campaignId} completed`);

        try {
          const ch = campaign.channelId
            ? await db
                .select()
                .from(channels)
                .where(eq(channels.id, campaign.channelId))
                .limit(1)
            : [];
          const channelName = ch[0]?.name || "Unknown";
          const ownerId = ch[0]?.createdBy;
          if (ownerId) {
            const ownerAndTeam = await db
              .select()
              .from(users)
              .where(eq(users.id, ownerId));
            const teamMembers = await db
              .select()
              .from(users)
              .where(eq(users.createdBy, ownerId));
            const targetUserIds = [
              ...new Set([...ownerAndTeam, ...teamMembers].map((u) => u.id)),
            ];
            const hasFailed = (campaign.failedCount || 0) > (campaign.sentCount || 0);
            const eventType = hasFailed
              ? NOTIFICATION_EVENTS.CAMPAIGN_FAILED
              : NOTIFICATION_EVENTS.CAMPAIGN_COMPLETED;
            await triggerNotification(
              eventType,
              {
                campaignName: campaign.name || "Untitled Campaign",
                totalSent: String(campaign.sentCount || 0),
                deliveredCount: String(
                  (campaign.sentCount || 0) - (campaign.failedCount || 0)
                ),
                failedCount: String(campaign.failedCount || 0),
                errorMessage: hasFailed ? "Some messages could not be delivered" : "",
                channelName,
              },
              targetUserIds,
              campaign.channelId || undefined
            );
          }
        } catch (notifyErr) {
          console.error(`[MessageQueue] Error sending completion notification for ${campaignId}:`, notifyErr);
        }
      } catch (err) {
        console.error(`[MessageQueue] Error checking completion for campaign ${campaignId}:`, err);
      }
    }
  }

  private static async processMessage(message: any, channelCache?: Map<string, any>) {
    let templateContent = `Template: ${message.templateName}`;
    try {
      if (message.templateName) {
        let tmplRow: { body: string } | undefined;
        if (message.channelId) {
          [tmplRow] = await db
            .select({ body: templates.body })
            .from(templates)
            .where(and(eq(templates.name, message.templateName), eq(templates.channelId, message.channelId)))
            .limit(1);
        }
        if (!tmplRow) {
          [tmplRow] = await db
            .select({ body: templates.body })
            .from(templates)
            .where(eq(templates.name, message.templateName))
            .limit(1);
        }
        if (tmplRow?.body) templateContent = tmplRow.body;
      }

      let channel = channelCache?.get(message.channelId);
      if (!channel) {
        channel = await cacheGet(
          CACHE_KEYS.channel(message.channelId),
          CACHE_TTL.channel,
          async () => {
            const [ch] = await db
              .select()
              .from(channels)
              .where(eq(channels.id, message.channelId))
              .limit(1);
            return ch || null;
          }
        );
      }

      if (!channel) {
        throw new Error(`Channel not found: ${message.channelId}`);
      }

      const channelTier = (channel.healthDetails as any)?.messaging_limit as string | undefined;
      const canSend = await WhatsAppApiService.checkRateLimit(channel.id, channelTier);
      if (!canSend) {
        await db
          .update(messageQueue)
          .set({ 
            status: "queued",
            scheduledFor: new Date(Date.now() + 5000)
          })
          .where(eq(messageQueue.id, message.id));
        return;
      }

      const isMarketing = message.messageType === "marketing" && 
                         message.sentVia !== "cloud_api";

      let response;
      if (message.templateName) {
        const language = (message as any).templateLanguage || "en_US";
        response = await WhatsAppApiService.sendTemplateMessage(
          channel,
          message.recipientPhone,
          message.templateName,
          message.templateParams || [],
          language,
          isMarketing
        );
      } else if (channel.connectionMethod === "qr_code" && message.campaignId) {
        const campaign = await storage.getCampaign(message.campaignId);
        if (!campaign) {
          throw new Error(`Campaign not found: ${message.campaignId}`);
        }

        const isWarmer = message.templateParams && (message.templateParams as any).isWarmer;
        let text = "";
        let mediaUrl = campaign.mediaUrl;
        let mediaMimeType = campaign.mediaMimeType;
        let mediaName = campaign.mediaName;

        if (isWarmer) {
          text = (message.templateParams as any).customMessage || "";
          mediaUrl = null;
        } else {
          text = campaign.customMessage || "";
        }

        // Interpolate variables in customMessage (e.g. {{name}}, {{phone}}, etc.)
        let contactName = message.recipientPhone;
        const [contact] = await db
          .select()
          .from(contacts)
          .where(and(eq(contacts.channelId, channel.id), eq(contacts.phone, message.recipientPhone)))
          .limit(1);
        if (contact) {
          contactName = contact.name || contactName;
        }

        text = text.replace(/\{\{\s*name\s*\}\}/gi, contactName);
        text = text.replace(/\{\{\s*phone\s*\}\}/gi, message.recipientPhone);

        // Strip HTML tags from WYSIWYG editor if needed, or send as is.
        text = text
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<p>/gi, "")
          .replace(/<b>(.*?)<\/b>/gi, "*$1*")
          .replace(/<strong>(.*?)<\/strong>/gi, "*$1*")
          .replace(/<i>(.*?)<\/i>/gi, "_$1_")
          .replace(/<em>(.*?)<\/em>/gi, "_$1_")
          .replace(/<del>(.*?)<\/del>/gi, "~$1~")
          .replace(/<code[^>]*>(.*?)<\/code>/gi, "```$1```")
          .replace(/<[^>]*>/g, ""); // Strip remaining HTML tags

        // Decoded HTML entities
        text = text
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .replace(/&quot;/gi, '"');

        if (mediaUrl) {
          const mediaData = {
            url: mediaUrl,
            mimeType: mediaMimeType || "application/octet-stream",
            filename: mediaName || "file"
          };
          response = await BaileysManager.sendMediaMessage(
            channel.id,
            message.recipientPhone,
            mediaData,
            text || undefined
          );
        } else {
          response = await BaileysManager.sendMessage(
            channel.id,
            message.recipientPhone,
            text
          );
        }
      } else {
        throw new Error("Non-template messages not yet implemented");
      }

      const waMessageId = response.messages?.[0]?.id;

      const isQrCode = channel.connectionMethod === "qr_code";

      await db
        .update(messageQueue)
        .set({
          status: "sent",
          whatsappMessageId: waMessageId,
          sentVia: isMarketing ? "marketing_messages" : (isQrCode ? "qr_code" : "cloud_api"),
          attempts: message.attempts + 1
        })
        .where(eq(messageQueue.id, message.id));

      if (message.campaignId) {
        if (isQrCode) {
          await db
            .update(campaigns)
            .set({
              sentCount: sql`${campaigns.sentCount} + 1`,
              deliveredCount: sql`${campaigns.deliveredCount} + 1`,
              readCount: sql`${campaigns.readCount} + 1`,
            })
            .where(eq(campaigns.id, message.campaignId));

          await db
            .update(campaignRecipients)
            .set({
              status: "read",
              whatsappMessageId: waMessageId,
              sentAt: new Date(),
              deliveredAt: new Date(),
              readAt: new Date()
            })
            .where(and(
              eq(campaignRecipients.campaignId, message.campaignId),
              eq(campaignRecipients.phone, message.recipientPhone)
            ));
        } else {
          await db
            .update(campaigns)
            .set({
              sentCount: sql`${campaigns.sentCount} + 1`
            })
            .where(eq(campaigns.id, message.campaignId));
        }
      }

      try {
        const [existingConv] = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(and(
            eq(conversations.channelId, message.channelId),
            eq(conversations.contactPhone, message.recipientPhone)
          ))
          .limit(1);

        let conversationId = existingConv?.id;
        if (!conversationId) {
          const [newConv] = await db
            .insert(conversations)
            .values({
              channelId: message.channelId,
              contactPhone: message.recipientPhone,
              contactName: message.recipientPhone,
              status: "open",
              type: "whatsapp",
              lastMessageAt: new Date(),
            })
            .returning({ id: conversations.id });
          conversationId = newConv.id;
        } else {
          await db
            .update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));
        }

        await db.insert(messages).values({
          conversationId,
          campaignId: message.campaignId || null,
          whatsappMessageId: waMessageId || null,
          content: templateContent,
          type: "template",
          messageType: "template",
          direction: "outbound",
          fromUser: false,
          fromType: "campaign",
          status: isQrCode ? "read" : "sent",
        });
      } catch (logErr) {
        console.error(`[MessageQueue] Failed to write message log for ${message.id}:`, logErr);
      }

      console.log(`[MessageQueue] Message sent: ${message.id}`);
    } catch (error) {
      console.error(`[MessageQueue] Failed to send message ${message.id}:`, error);

      const err = error as any;
      await db
        .update(messageQueue)
        .set({
          status: message.attempts >= 2 ? "failed" : "queued",
          attempts: message.attempts + 1,
          errorCode: err?.metaErrorCode
            ? String(err.metaErrorCode)
            : error instanceof Error ? error.name : "UNKNOWN_ERROR",
          errorMessage: error instanceof Error
            ? [err?.metaErrorTitle, error.message].filter(Boolean).join(" — ")
            : String(error),
          scheduledFor: message.attempts < 2 
            ? new Date(Date.now() + Math.pow(2, message.attempts + 1) * 1000)
            : null
        })
        .where(eq(messageQueue.id, message.id));

      if (message.campaignId && message.attempts >= 2) {
        await db
          .update(campaigns)
          .set({
            failedCount: sql`${campaigns.failedCount} + 1`
          })
          .where(eq(campaigns.id, message.campaignId));
      }

      if (message.attempts >= 2) {
        try {
          const [existingConv] = await db
            .select({ id: conversations.id })
            .from(conversations)
            .where(and(
              eq(conversations.channelId, message.channelId),
              eq(conversations.contactPhone, message.recipientPhone)
            ))
            .limit(1);

          let conversationId = existingConv?.id;
          if (!conversationId) {
            const [newConv] = await db
              .insert(conversations)
              .values({
                channelId: message.channelId,
                contactPhone: message.recipientPhone,
                contactName: message.recipientPhone,
                status: "open",
                type: "whatsapp",
                lastMessageAt: new Date(),
              })
              .returning({ id: conversations.id });
            conversationId = newConv.id;
          }

          const rawMetaCode = err?.metaErrorCode;
          const errorCode = rawMetaCode
            ? String(rawMetaCode)
            : err instanceof Error ? err.name : "UNKNOWN_ERROR";
          const rawErrorMsg = err instanceof Error ? err.message : String(err);

          const waError = rawMetaCode ? getWhatsAppError(rawMetaCode) : null;
          const errorTitle = err?.metaErrorTitle || waError?.title || "Message Failed";
          const suggestion = waError?.suggestion || null;
          const description = waError?.description || null;
          const humanMessage = description || rawErrorMsg;

          const rawMetaPayload = err?.rawResponse || err?.metaErrorData || null;

          await db
            .update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));

          await db.insert(messages).values({
            conversationId,
            campaignId: message.campaignId || null,
            content: templateContent,
            type: "template",
            messageType: "template",
            direction: "outbound",
            fromUser: false,
            fromType: "campaign",
            status: "failed",
            errorCode,
            errorMessage: [errorTitle, humanMessage].filter(Boolean).join(" — "),
            errorDetails: {
              code: errorCode,
              title: errorTitle,
              message: humanMessage,
              ...(rawErrorMsg !== humanMessage ? { rawMessage: rawErrorMsg } : {}),
              ...(suggestion ? { suggestion } : {}),
              ...(rawMetaPayload ? { errorData: rawMetaPayload } : {}),
            },
          });
        } catch (logErr) {
          console.error(`[MessageQueue] Failed to write failure log for ${message.id}:`, logErr);
        }
      }
    }
  }

  static async queueCampaignMessages(
    campaignId: string,
    channelId: string,
    recipients: string[],
    templateName: string,
    templateParams: any[] = [],
    messageType: string = "marketing",
    scheduledFor?: Date
  ): Promise<number> {
    const messagesToQueue = recipients.map(phone => ({
      campaignId,
      channelId,
      recipientPhone: phone,
      templateName,
      templateParams,
      messageType,
      status: "queued" as const,
      scheduledFor
    }));

    const batchSize = 100;
    let totalQueued = 0;

    for (let i = 0; i < messagesToQueue.length; i += batchSize) {
      const batch = messagesToQueue.slice(i, i + batchSize);
      const inserted = await db.insert(messageQueue).values(batch).returning({ id: messageQueue.id });
      totalQueued += batch.length;

      if (this.usingBullMQ && isBullQueueAvailable()) {
        const bullJobs = inserted.map((row, idx) => ({
          messageId: row.id,
          channelId,
          recipientPhone: batch[idx].recipientPhone,
          templateName,
          templateParams,
          messageType,
          campaignId,
          scheduledFor,
        }));
        await addBulkMessagesToBullQueue(bullJobs);
      }
    }

    return totalQueued;
  }

  static async getQueueStats() {
    const stats = await db
      .select({
        status: messageQueue.status,
        count: sql<number>`count(*)::int`
      })
      .from(messageQueue)
      .groupBy(messageQueue.status);

    const dbStats = stats.reduce((acc, stat) => {
      if (stat.status) {
        acc[stat.status] = stat.count;
      }
      return acc;
    }, {} as Record<string, number>);

    if (this.usingBullMQ) {
      const bullStats = await getBullQueueStats();
      if (bullStats) {
        return { ...dbStats, bullmq: bullStats, engine: "bullmq" as const };
      }
    }

    return { ...dbStats, engine: "db-polling" as const };
  }

  static async clearOldFailedMessages(daysOld: number = 7) {
    const result = await db
      .delete(messageQueue)
      .where(
        and(
          eq(messageQueue.status, "failed"),
          sql`${messageQueue.createdAt} < NOW() - INTERVAL '${daysOld} days'`
        )
      );

    return result;
  }
}
