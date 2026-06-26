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
import { db } from "../db";
import { warmerConfigs, warmerMessages, channels, contacts, conversations, messages } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { WhatsAppApiService } from "../services/whatsapp-api";
import { randomUUID } from "crypto";

const lastSentTimeMap = new Map<string, number>();
const nextIntervalMap = new Map<string, number>();

export function startWhatsAppWarmerCron() {
  console.log("[WarmerCron] Starting WhatsApp Warmer background job...");
  
  cron.schedule("*/10 * * * * *", async () => {
    try {
      // Find all active warmer configs
      const activeConfigs = await db
        .select()
        .from(warmerConfigs)
        .where(eq(warmerConfigs.isActive, true));

      for (const config of activeConfigs) {
        try {
          const [channel] = await db
            .select()
            .from(channels)
            .where(eq(channels.id, config.channelId))
            .limit(1);

          if (!channel || !channel.isActive) continue;

          // Fetch messages for this config
          const msgList = await db
            .select()
            .from(warmerMessages)
            .where(eq(warmerMessages.warmerConfigId, config.id));

          if (msgList.length === 0) continue;

          const now = Date.now();
          const lastSent = lastSentTimeMap.get(config.id) || 0;
          let nextInterval = nextIntervalMap.get(config.id) || 0;

          if (lastSent === 0 || nextInterval === 0) {
            // First time initialization
            const min = config.minDelay ?? 10;
            const max = config.maxDelay ?? 60;
            nextInterval = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
            lastSentTimeMap.set(config.id, now);
            nextIntervalMap.set(config.id, nextInterval);
            continue;
          }

          if (now - lastSent >= nextInterval) {
            // Reset interval and timer
            const min = config.minDelay ?? 10;
            const max = config.maxDelay ?? 60;
            const newInterval = (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
            lastSentTimeMap.set(config.id, now);
            nextIntervalMap.set(config.id, newInterval);

            // Select random message
            const randomMsg = msgList[Math.floor(Math.random() * msgList.length)];

            // Select recipient: random contact or fallback test phone
            let recipientPhone = "+1234567890";
            const channelContacts = await db
              .select()
              .from(contacts)
              .where(eq(contacts.channelId, channel.id))
              .limit(5);

            if (channelContacts.length > 0) {
              const randomContact = channelContacts[Math.floor(Math.random() * channelContacts.length)];
              recipientPhone = randomContact.phone;
            }

            console.log(`[WarmerCron] Warmer sending message via channel "${channel.name}" to ${recipientPhone}: "${randomMsg.messageText}"`);

            const apiService = new WhatsAppApiService(channel);
            const sendResult = await apiService.sendTextMessage(recipientPhone, randomMsg.messageText);

            // Log message log entry in DB
            const [existingConv] = await db
              .select()
              .from(conversations)
              .where(and(
                eq(conversations.channelId, channel.id),
                eq(conversations.contactPhone, recipientPhone)
              ))
              .limit(1);

            let conversationId = existingConv?.id;
            if (!conversationId) {
              const [newConv] = await db
                .insert(conversations)
                .values({
                  channelId: channel.id,
                  contactPhone: recipientPhone,
                  contactName: recipientPhone,
                  status: "open",
                  type: "whatsapp",
                  lastMessageAt: new Date(),
                  lastMessageText: randomMsg.messageText
                })
                .returning({ id: conversations.id });
              conversationId = newConv.id;
            } else {
              await db
                .update(conversations)
                .set({
                  lastMessageAt: new Date(),
                  lastMessageText: randomMsg.messageText
                })
                .where(eq(conversations.id, conversationId));
            }

            await db.insert(messages).values({
              conversationId,
              whatsappMessageId: sendResult.messages?.[0]?.id || `warmer_${randomUUID()}`,
              content: randomMsg.messageText,
              type: "text",
              direction: "outbound",
              fromUser: false,
              fromType: "system",
              status: "delivered",
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        } catch (err) {
          console.error(`[WarmerCron] Error executing warmer for config ${config.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[WarmerCron] Error querying active warmer configurations:", err);
    }
  });
}
